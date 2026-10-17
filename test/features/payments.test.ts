import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, before, beforeEach, describe, it } from 'node:test'

import { seedBillingApi } from '../../src/billing-api/seed.ts'
import { createBillingApiServer, type BillingApiServer } from '../../src/billing-api/server.ts'
import { SqliteConfigurationRepository } from '../../src/cobrix/features/configuration/index.ts'
import {
	ImportInstallmentsUseCase,
	IspBillingApiAdapter,
	SqliteImportRepository,
} from '../../src/cobrix/features/import/index.ts'
import {
	ReconcilePaymentsUseCase,
	SimulatePaymentsUseCase,
	IspPaymentBillingApiAdapter,
	SqlitePaymentRepository,
} from '../../src/cobrix/features/payments/index.ts'
import { BillingApiClient, createCobrixDatabase, HttpClientService } from '../../src/cobrix/shared/index.ts'
import { SqliteDatabaseClient } from '../../src/cobrix/shared/infrastructure/database/database.client.ts'

// Pin the sandbox date
process.env.SANDBOX_TODAY = '2026-10-13'

describe('Feature: Payment Reconciliation (docs/ENUNCIADO.md §3.3, §4, §5)', () => {
	let tempDir: string
	let apiServer: BillingApiServer
	let baseUrl: string
	let billingApiClient: BillingApiClient
	let http: HttpClientService

	let cobrixDb: DatabaseSync
	let dbClient: SqliteDatabaseClient
	let importUseCase: ImportInstallmentsUseCase

	let paymentRepo: SqlitePaymentRepository
	let paymentBillingAdapter: IspPaymentBillingApiAdapter
	let reconcileUseCase: ReconcilePaymentsUseCase
	let simulateUseCase: SimulatePaymentsUseCase

	const ASSESSMENT_DATE = new Date('2026-10-13T12:00:00Z')

	before(async () => {
		tempDir = mkdtempSync(join(tmpdir(), 'cobrix-payments-test-'))
		const ispDbPath = join(tempDir, 'billing-api.sqlite')
		seedBillingApi(ispDbPath)
		apiServer = createBillingApiServer(ispDbPath)
		const port = await apiServer.listen(0, '127.0.0.1')
		baseUrl = `http://127.0.0.1:${port}`

		http = new HttpClientService()
		billingApiClient = new BillingApiClient({
			baseUrl,
			username: 'cobrix',
			password: 'cobrix-sandbox',
		})
	})

	after(async () => {
		await apiServer.close()
		rmSync(tempDir, { recursive: true, force: true })
	})

	beforeEach(async () => {
		// Reset ISP simulator to initial state
		await http.post(`${baseUrl}/__sim/reiniciar`, {})

		// Fresh Cobrix DB per test
		const instance = createCobrixDatabase(':memory:')
		cobrixDb = instance.db
		dbClient = new SqliteDatabaseClient(cobrixDb)

		const importRepo = new SqliteImportRepository(dbClient)
		const configRepo = new SqliteConfigurationRepository(dbClient)
		const importAdapter = new IspBillingApiAdapter(billingApiClient)
		importUseCase = new ImportInstallmentsUseCase(importAdapter, importRepo, configRepo)

		// 1. Initial import: 20 customers, 42 open invoices ($1,235.00)
		await importUseCase.execute({ referenceDate: ASSESSMENT_DATE })

		paymentRepo = new SqlitePaymentRepository(dbClient)
		paymentBillingAdapter = new IspPaymentBillingApiAdapter(billingApiClient)
		reconcileUseCase = new ReconcilePaymentsUseCase(paymentBillingAdapter, paymentRepo)
		simulateUseCase = new SimulatePaymentsUseCase(reconcileUseCase)
	})

	it('Reconciles payments from simulator: marks 8 invoices PAID and leaves 34 OPEN for USD 955.00 (§5)', async () => {
		// 1. Register payments in cash desk simulator (§5)
		// Ana Perez (900101): full debt
		await http.post(`${baseUrl}/__sim/pagar`, { id_contrato: 900101 })

		// Luis Gomez cortado (900103): partial pay 25 (cuotas of 20)
		await http.post(`${baseUrl}/__sim/pagar`, { id_contrato: 900103, monto: 25 })

		// Comercial El Faro (900104): full debt
		await http.post(`${baseUrl}/__sim/pagar`, { id_contrato: 900104 })

		// Miguel Angel Soto (900114): pay 70 (2 oldest cuotas of 35)
		await http.post(`${baseUrl}/__sim/pagar`, { id_contrato: 900114, monto: 70 })

		// Elena Ruiz (900113): pay then annul
		const elenaPay = await http.post<{ id_factura: number }>(`${baseUrl}/__sim/pagar`, { id_contrato: 900113 })
		await http.post(`${baseUrl}/__sim/anular`, { id_factura: elenaPay.id_factura })

		// 2. Run payment reconciliation
		const summary = await reconcileUseCase.execute()

		// Acceptance Criteria §5:
		// Total 8 invoices marked paid
		assert.equal(summary.paidInvoicesCount, 8)
		assert.equal(summary.partialPaymentsCount, 1)

		// Database checks
		const paidCount = cobrixDb.prepare("SELECT count(*) as count FROM invoice WHERE status = 'PAID'").get() as { count: number }
		const openCount = cobrixDb.prepare("SELECT count(*) as count FROM invoice WHERE status = 'OPEN'").get() as { count: number }
		const openDebt = cobrixDb.prepare("SELECT round(sum(balance), 2) as total FROM invoice WHERE status = 'OPEN'").get() as { total: number }

		assert.equal(paidCount.count, 8)
		assert.equal(openCount.count, 34)
		assert.equal(openDebt.total, 955.00)

		// Verify Luis Gomez partial payment invoice
		const partialInvoice = cobrixDb.prepare(
			"SELECT balance, is_partial_payment, status FROM invoice WHERE contract_id = 900103 AND status = 'OPEN' ORDER BY period LIMIT 1",
		).get() as { balance: number; is_partial_payment: number; status: string }
		assert.ok(partialInvoice)
		assert.equal(partialInvoice.status, 'OPEN')
		assert.equal(partialInvoice.is_partial_payment, 1)
		assert.equal(partialInvoice.balance, 20.00)

		// Verify Elena Ruiz remains open and unaffected by annulled payment
		const elenaInvoices = cobrixDb.prepare(
			"SELECT status FROM invoice WHERE contract_id = 900113",
		).all() as Array<{ status: string }>
		assert.ok(elenaInvoices.every(i => i.status === 'OPEN'))

		// 3. Idempotency: repeating update changes nothing
		const repeatSummary = await reconcileUseCase.execute()
		assert.equal(repeatSummary.paidInvoicesCount, 0)

		const repeatPaidCount = cobrixDb.prepare("SELECT count(*) as count FROM invoice WHERE status = 'PAID'").get() as { count: number }
		const repeatOpenCount = cobrixDb.prepare("SELECT count(*) as count FROM invoice WHERE status = 'OPEN'").get() as { count: number }
		const repeatOpenDebt = cobrixDb.prepare("SELECT round(sum(balance), 2) as total FROM invoice WHERE status = 'OPEN'").get() as { total: number }

		assert.equal(repeatPaidCount.count, 8)
		assert.equal(repeatOpenCount.count, 34)
		assert.equal(repeatOpenDebt.total, 955.00)
	})

	it('Simulate payments: predicts 8 invoices to be marked PAID without modifying invoice table', async () => {
		// Register payments in cash desk simulator
		await http.post(`${baseUrl}/__sim/pagar`, { id_contrato: 900101 })
		await http.post(`${baseUrl}/__sim/pagar`, { id_contrato: 900103, monto: 25 })
		await http.post(`${baseUrl}/__sim/pagar`, { id_contrato: 900104 })
		await http.post(`${baseUrl}/__sim/pagar`, { id_contrato: 900114, monto: 70 })

		const simSummary = await simulateUseCase.execute()
		assert.equal(simSummary.isSimulation, true)
		assert.equal(simSummary.paidInvoicesCount, 8)

		// Verification: DB invoices remain unchanged (0 PAID)
		const paidCount = cobrixDb.prepare("SELECT count(*) as count FROM invoice WHERE status = 'PAID'").get() as { count: number }
		assert.equal(paidCount.count, 0)
	})

	it('Reverses paid invoice when payment is annulled in ISP cashier after being reconciled (reopens to OPEN)', async () => {
		// 1. Pay Elena Ruiz (900113) in ISP cashier (has 2 cuotas)
		const elenaPay = await http.post<{ id_factura: number }>(`${baseUrl}/__sim/pagar`, { id_contrato: 900113 })

		// 2. Reconcile: Both of Elena Ruiz's invoices are marked PAID
		const firstReconcile = await reconcileUseCase.execute()
		assert.equal(firstReconcile.paidInvoicesCount, 2)

		const elenaPaidInvoices = cobrixDb.prepare(
			"SELECT status, balance FROM invoice WHERE contract_id = 900113",
		).all() as Array<{ status: string; balance: number }>
		assert.equal(elenaPaidInvoices.length, 2)
		assert.ok(elenaPaidInvoices.every(i => i.status === 'PAID' && i.balance === 0))

		// 3. Annul payment in ISP cashier
		await http.post(`${baseUrl}/__sim/anular`, { id_factura: elenaPay.id_factura })

		// 4. Reconcile again: Cobrix detects payment annulment and reverts invoices to OPEN
		const secondReconcile = await reconcileUseCase.execute()
		assert.equal(secondReconcile.reopenedInvoicesCount, 2)

		const elenaReopenedInvoices = cobrixDb.prepare(
			"SELECT status, balance, paid_by_invoice_number, paid_at FROM invoice WHERE contract_id = 900113",
		).all() as Array<{ status: string; balance: number; paid_by_invoice_number: string | null; paid_at: string | null }>
		assert.equal(elenaReopenedInvoices.length, 2)
		assert.ok(elenaReopenedInvoices.every(i => i.status === 'OPEN' && i.balance > 0 && i.paid_by_invoice_number === null && i.paid_at === null))
	})
})
