import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, before, beforeEach, describe, it } from 'node:test'

import { seedBillingApi } from '../../src/billing-api/seed.ts'
import { createBillingApiServer, type BillingApiServer } from '../../src/billing-api/server.ts'
import {
	SqliteConfigurationRepository,
} from '../../src/cobrix/features/configuration/index.ts'
import {
	ImportInstallmentsUseCase,
	SimulateImportUseCase,
	IspBillingApiAdapter,
	SqliteImportRepository,
} from '../../src/cobrix/features/import/index.ts'
import { BillingApiClient, createCobrixDatabase } from '../../src/cobrix/shared/index.ts'
import { SqliteDatabaseClient } from '../../src/cobrix/shared/infrastructure/database/database.client.ts'

// Pin the assessment sandbox date
process.env.SANDBOX_TODAY = '2026-10-13'

describe('Feature: Import Customers and Invoices (docs/ENUNCIADO.md §3.2, §4, §5)', () => {
	let tempDir: string
	let apiServer: BillingApiServer
	let baseUrl: string
	let billingApiClient: BillingApiClient
	let ispAdapter: IspBillingApiAdapter

	// Cobrix local database per test
	let cobrixDb: DatabaseSync
	let dbClient: SqliteDatabaseClient
	let importRepo: SqliteImportRepository
	let configRepo: SqliteConfigurationRepository
	let importUseCase: ImportInstallmentsUseCase
	let simulateUseCase: SimulateImportUseCase

	const ASSESSMENT_DATE = new Date('2026-10-13T12:00:00Z')

	before(async () => {
		tempDir = mkdtempSync(join(tmpdir(), 'cobrix-import-test-'))
		const ispDbPath = join(tempDir, 'billing-api.sqlite')
		seedBillingApi(ispDbPath)
		apiServer = createBillingApiServer(ispDbPath)
		const port = await apiServer.listen(0, '127.0.0.1')
		baseUrl = `http://127.0.0.1:${port}`

		billingApiClient = new BillingApiClient({
			baseUrl,
			username: 'cobrix',
			password: 'cobrix-sandbox',
		})
		ispAdapter = new IspBillingApiAdapter(billingApiClient)
	})

	after(async () => {
		await apiServer.close()
		rmSync(tempDir, { recursive: true, force: true })
	})

	beforeEach(() => {
		// Fresh Cobrix database per test
		const instance = createCobrixDatabase(':memory:')
		cobrixDb = instance.db

		dbClient = new SqliteDatabaseClient(cobrixDb)
		importRepo = new SqliteImportRepository(dbClient)
		configRepo = new SqliteConfigurationRepository(dbClient)
		importUseCase = new ImportInstallmentsUseCase(ispAdapter, importRepo, configRepo)
		simulateUseCase = new SimulateImportUseCase(importUseCase)
	})

	it('Simular importación: predicts 42 invoices to import without writing any domain record (§5)', async () => {
		const summary = await simulateUseCase.execute({
			referenceDate: ASSESSMENT_DATE,
		})

		assert.equal(summary.isSimulation, true)
		assert.equal(summary.importedInvoicesCount, 42)
		assert.equal(summary.importedCustomersCount, 20)
		assert.equal(summary.importedAmount, 1235.00)

		// Verification: 0 domain entities created in Cobrix DB
		const customerCount = cobrixDb.prepare('SELECT count(*) as count FROM customer').get() as { count: number }
		const contractCount = cobrixDb.prepare('SELECT count(*) as count FROM contract').get() as { count: number }
		const invoiceCount = cobrixDb.prepare('SELECT count(*) as count FROM invoice').get() as { count: number }

		assert.equal(customerCount.count, 0)
		assert.equal(contractCount.count, 0)
		assert.equal(invoiceCount.count, 0)

		// Sync run audit was recorded
		const runCount = cobrixDb.prepare('SELECT count(*) as count FROM sync_run WHERE is_simulation = 1').get() as { count: number }
		assert.equal(runCount.count, 1)
	})

	it('Importar: creates exactly 20 customers and 42 open invoices totaling USD 1,235.00 (§5)', async () => {
		const summary = await importUseCase.execute({
			isSimulation: false,
			referenceDate: ASSESSMENT_DATE,
		})

		assert.equal(summary.isSimulation, false)
		assert.equal(summary.importedInvoicesCount, 42)
		assert.equal(summary.importedCustomersCount, 20)
		assert.equal(summary.importedAmount, 1235.00)

		// Database checks
		const customerCount = cobrixDb.prepare('SELECT count(*) as count FROM customer').get() as { count: number }
		const openInvoices = cobrixDb.prepare("SELECT count(*) as count FROM invoice WHERE status = 'OPEN'").get() as { count: number }
		const totalDebt = cobrixDb.prepare('SELECT round(sum(balance), 2) as total FROM invoice').get() as { total: number }

		assert.equal(customerCount.count, 20)
		assert.equal(openInvoices.count, 42)
		assert.equal(totalDebt.total, 1235.00)
	})

	it('Excluidas: excludes 9 cuotas by status, 1 contract by incoherent currency, and 1 residual debt (§5)', async () => {
		const summary = await importUseCase.execute({
			isSimulation: false,
			referenceDate: ASSESSMENT_DATE,
		})

		// 9 cuotas excluded by contract status (CR, CA, RE, AN)
		const excludedByStatus = summary.items.filter(i => i.result === 'EXCLUDED_STATUS')
		assert.equal(excludedByStatus.length, 9)

		// 1 contract excluded by incoherent currency (Jorge Castillo, contrato 900110: 2 cuotas)
		const incoherentCurrency = summary.items.filter(i => i.result === 'INCOHERENT_CURRENCY')
		assert.equal(incoherentCurrency.length, 2)
		assert.ok(incoherentCurrency.every(i => i.contractId === 900110))

		// 1 installment excluded by residual balance (Sofia Torres: 0.001317)
		const residualDebt = summary.items.filter(i => i.result === 'RESIDUAL_DEBT')
		assert.equal(residualDebt.length, 1)
		assert.equal(residualDebt[0]!.contractId, 900111)

		// Discarded as zero debt (Laura Mendez: deuda_id "0")
		const zeroDebt = summary.items.filter(i => i.result === 'NO_DEBT')
		assert.equal(zeroDebt.length, 1)
		assert.equal(zeroDebt[0]!.contractId, 900109)

		// Forbidden customers must NOT appear in customer table (§5)
		const forbiddenHolders = [
			'CARLOS ROJAS',
			'ROSA DIAZ',
			'PEDRO LEON',
			'ANDRES VARGAS',
			'LAURA MENDEZ',
			'JORGE CASTILLO',
		]

		for (const name of forbiddenHolders) {
			const found = cobrixDb.prepare('SELECT 1 FROM customer WHERE name = ?').get(name)
			assert.equal(found, undefined, `Customer ${name} should NOT exist in Cobrix`)
		}
	})

	it('Normalización: normalizes Elena Ruiz 09000123 to ID 9000123 (§5)', async () => {
		await importUseCase.execute({
			isSimulation: false,
			referenceDate: ASSESSMENT_DATE,
		})

		const normalizedElena = cobrixDb.prepare('SELECT id, name FROM customer WHERE id = ?').get('9000123') as { id: string; name: string }
		assert.ok(normalizedElena)
		assert.equal(normalizedElena.name, 'ELENA RUIZ')

		// Old unnormalized id must not exist
		const unnormalizedElena = cobrixDb.prepare('SELECT 1 FROM customer WHERE id = ?').get('09000123')
		assert.equal(unnormalizedElena, undefined)
	})

	it('Contratos múltiples: Luis Gomez has 1 customer record with 2 contracts (active and cortado, §5)', async () => {
		await importUseCase.execute({
			isSimulation: false,
			referenceDate: ASSESSMENT_DATE,
		})

		const luisCustomer = cobrixDb.prepare('SELECT id, name FROM customer WHERE id = ?').get('V9876543') as { id: string; name: string }
		assert.ok(luisCustomer)
		assert.equal(luisCustomer.name, 'LUIS GOMEZ')

		const contracts = cobrixDb.prepare('SELECT id, status, plan_name FROM contract WHERE customer_id = ? ORDER BY id').all('V9876543') as Array<{ id: number; status: string; plan_name: string }>
		assert.equal(contracts.length, 2)
		assert.equal(contracts[0]!.id, 900102)
		assert.equal(contracts[0]!.status, 'ACTIVO')
		assert.equal(contracts[1]!.id, 900103)
		assert.equal(contracts[1]!.status, 'CORTADO')
	})

	it('Idempotencia: importing a second time creates 0 new invoices (§5)', async () => {
		// First import
		const first = await importUseCase.execute({
			isSimulation: false,
			referenceDate: ASSESSMENT_DATE,
		})
		assert.equal(first.importedInvoicesCount, 42)

		// Second import
		const second = await importUseCase.execute({
			isSimulation: false,
			referenceDate: ASSESSMENT_DATE,
		})
		assert.equal(second.importedInvoicesCount, 0)
		assert.equal(second.importedAmount, 0)

		const alreadyImported = second.items.filter(i => i.result === 'ALREADY_IMPORTED')
		assert.equal(alreadyImported.length, 42)

		// Totals remain unchanged
		const totalInvoices = cobrixDb.prepare('SELECT count(*) as count FROM invoice').get() as { count: number }
		assert.equal(totalInvoices.count, 42)
	})

	it('Topes por corrida: stops importing when maxNewInvoices cap is reached (§3.1)', async () => {
		const summary = await importUseCase.execute({
			isSimulation: false,
			referenceDate: ASSESSMENT_DATE,
			configOverride: { maxNewInvoices: 5 },
		})

		assert.equal(summary.importedInvoicesCount, 5)

		const stopped = summary.items.filter(i => i.result === 'STOPPED_BY_CAP')
		assert.ok(stopped.length > 0)

		const invoiceCount = cobrixDb.prepare('SELECT count(*) as count FROM invoice').get() as { count: number }
		assert.equal(invoiceCount.count, 5)
	})
})
