import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { SqliteDatabaseClient, type DatabaseClient } from '../../src/cobrix/shared/infrastructure/database/database.client.ts'
import { createCobrixDatabase } from '../../src/cobrix/shared/infrastructure/database/database.ts'
import {
	GetCustomerDossierUseCase,
	ListCustomersUseCase,
	SqliteCustomerRepository,
} from '../../src/cobrix/features/customers/index.ts'

describe('Feature: Customers and Dossier (docs/ENUNCIADO.md §3.5 & §3.6)', () => {
	let dbClient: DatabaseClient
	let repository: SqliteCustomerRepository
	let listCustomersUseCase: ListCustomersUseCase
	let getCustomerDossierUseCase: GetCustomerDossierUseCase

	beforeEach(() => {
		const instance = createCobrixDatabase(':memory:')
		dbClient = new SqliteDatabaseClient(instance.db)
		repository = new SqliteCustomerRepository(dbClient)
		listCustomersUseCase = new ListCustomersUseCase(repository)
		getCustomerDossierUseCase = new GetCustomerDossierUseCase(repository)
	})

	it('returns empty list when no customers exist', async () => {
		const result = await listCustomersUseCase.execute()
		assert.deepEqual(result, [])
	})

	it('lists customers with correct aggregated counters and oldest due date', async () => {
		dbClient.execute(
			`INSERT INTO customer (id, name, person_type, email, phone, origin, created_at)
			 VALUES ('9000101', 'Ana Pérez', 'NATURAL', 'ana@example.com', '04141234567', 'ISP', '2026-10-13T10:00:00Z'),
			        ('9000103', 'Luis Gómez', 'NATURAL', 'luis@example.com', '04121234567', 'ISP', '2026-10-13T10:00:00Z')`
		)

		dbClient.execute(
			`INSERT INTO contract (id, code, customer_id, status, plan_name, plan_price, branch_name)
			 VALUES (900101, 'CTR-900101', '9000101', 'ACTIVO', 'PLAN 25MB', 25.00, 'Caracas'),
			        (900103, 'CTR-900103-A', '9000103', 'ACTIVO', 'PLAN 20MB', 20.00, 'Maracaibo'),
			        (900104, 'CTR-900103-B', '9000103', 'CORTADO', 'PLAN 20MB', 20.00, 'Maracaibo')`
		)

		dbClient.execute(
			`INSERT INTO invoice (external_installment_id, contract_id, customer_id, period, due_date, cutoff_date, total_amount, balance, status, imported_at)
			 VALUES ('101', 900101, '9000101', '2026-07', '2026-07-01', '2026-07-06', 25.00, 25.00, 'OPEN', '2026-10-13T10:00:00Z'),
			        ('102', 900101, '9000101', '2026-08', '2026-08-01', '2026-08-06', 25.00, 25.00, 'OPEN', '2026-10-13T10:00:00Z'),
			        ('103', 900103, '9000103', '2026-06', '2026-06-01', '2026-06-06', 20.00, 20.00, 'OPEN', '2026-10-13T10:00:00Z')`
		)

		const customers = await listCustomersUseCase.execute()
		assert.equal(customers.length, 2)

		const ana = customers.find(c => c.id === '9000101')!
		assert.equal(ana.name, 'Ana Pérez')
		assert.equal(ana.contractsCount, 1)
		assert.equal(ana.openInvoicesCount, 2)
		assert.equal(ana.paidInvoicesCount, 0)
		assert.equal(ana.totalDebt, 50.00)
		assert.equal(ana.oldestDueDate, '2026-07-01')

		const luis = customers.find(c => c.id === '9000103')!
		assert.equal(luis.name, 'Luis Gómez')
		assert.equal(luis.contractsCount, 2)
		assert.equal(luis.openInvoicesCount, 1)
		assert.equal(luis.totalDebt, 20.00)
		assert.equal(luis.oldestDueDate, '2026-06-01')
	})

	it('filters customers by query matching name or identification', async () => {
		dbClient.execute(
			`INSERT INTO customer (id, name, person_type, origin, created_at)
			 VALUES ('V12345678', 'Carlos Mendoza', 'NATURAL', 'ISP', '2026-10-13T10:00:00Z'),
			        ('J401234567', 'Comercial El Faro C.A.', 'LEGAL', 'ISP', '2026-10-13T10:00:00Z')`
		)

		const byName = await listCustomersUseCase.execute('Faro')
		assert.equal(byName.length, 1)
		assert.equal(byName[0]!.id, 'J401234567')

		const byId = await listCustomersUseCase.execute('12345678')
		assert.equal(byId.length, 1)
		assert.equal(byId[0]!.name, 'Carlos Mendoza')
	})

	it('returns full customer dossier with profile, contracts, invoices and timeline', async () => {
		dbClient.execute(
			`INSERT INTO customer (id, name, person_type, email, phone, address, origin, created_at)
			 VALUES ('9000101', 'Ana Pérez', 'NATURAL', 'ana@example.com', '04141234567', 'Calle 5, Caracas', 'ISP', '2026-10-13T10:00:00Z')`
		)

		dbClient.execute(
			`INSERT INTO contract (id, code, customer_id, status, plan_name, plan_price, branch_name)
			 VALUES (900101, 'CTR-900101', '9000101', 'ACTIVO', 'PLAN 25MB', 25.00, 'Caracas')`
		)

		dbClient.execute(
			`INSERT INTO invoice (external_installment_id, contract_id, customer_id, period, due_date, cutoff_date, total_amount, balance, status, is_partial_payment, paid_at, paid_by_invoice_number, imported_at)
			 VALUES ('101', 900101, '9000101', '2026-07', '2026-07-01', '2026-07-06', 25.00, 0.00, 'PAID', 0, '2026-10-13T14:30:00Z', 'REC-001', '2026-10-13T10:00:00Z'),
			        ('102', 900101, '9000101', '2026-08', '2026-08-01', '2026-08-06', 25.00, 25.00, 'OPEN', 0, NULL, NULL, '2026-10-13T10:00:00Z')`
		)

		const dossier = await getCustomerDossierUseCase.execute('9000101')
		assert.ok(dossier)

		// Profile
		assert.equal(dossier.profile.id, '9000101')
		assert.equal(dossier.profile.name, 'Ana Pérez')
		assert.equal(dossier.profile.personType, 'NATURAL')
		assert.equal(dossier.profile.email, 'ana@example.com')

		// Contracts
		assert.equal(dossier.contracts.length, 1)
		assert.equal(dossier.contracts[0]!.planName, 'PLAN 25MB')

		// Invoices
		assert.equal(dossier.invoices.length, 2)
		const paidInv = dossier.invoices.find(inv => inv.status === 'PAID')!
		assert.equal(paidInv.paidByInvoiceNumber, 'REC-001')

		// Totals
		assert.equal(dossier.totals.totalDebt, 25.00)
		assert.equal(dossier.totals.openCount, 1)
		assert.equal(dossier.totals.paidCount, 1)
		assert.equal(dossier.totals.contractsCount, 1)

		// Timeline
		assert.ok(dossier.timeline.length >= 3)
		const createdEvent = dossier.timeline.find(e => e.title.includes('Cliente creado'))
		assert.ok(createdEvent)
		const paidEvent = dossier.timeline.find(e => e.title.includes('Factura pagada'))
		assert.ok(paidEvent)
	})

	it('returns null when querying non-existent customer dossier', async () => {
		const dossier = await getCustomerDossierUseCase.execute('999999999')
		assert.equal(dossier, null)
	})
})
