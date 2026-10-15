import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { SqliteDatabaseClient, type DatabaseClient } from '../../src/cobrix/shared/infrastructure/database/database.client.ts'
import { createCobrixDatabase } from '../../src/cobrix/shared/infrastructure/database/database.ts'
import {
	GetRecentRunsUseCase,
	GetRunDetailUseCase,
	SqliteRunsRepository,
} from '../../src/cobrix/features/runs/index.ts'

describe('Feature: Runs (docs/ENUNCIADO.md §3.4)', () => {
	let dbClient: DatabaseClient
	let repository: SqliteRunsRepository
	let getRecentRunsUseCase: GetRecentRunsUseCase
	let getRunDetailUseCase: GetRunDetailUseCase

	beforeEach(() => {
		const instance = createCobrixDatabase(':memory:')
		dbClient = new SqliteDatabaseClient(instance.db)
		repository = new SqliteRunsRepository(dbClient)
		getRecentRunsUseCase = new GetRecentRunsUseCase(repository)
		getRunDetailUseCase = new GetRunDetailUseCase(repository)
	})

	it('returns empty array when no sync runs exist', async () => {
		const runs = await getRecentRunsUseCase.execute()
		assert.deepEqual(runs, [])
	})

	it('returns recent runs ordered newest first with correct domain mappings', async () => {
		dbClient.execute(
			`INSERT INTO sync_run (type, is_simulation, status, summary, error_message, started_at, finished_at)
			 VALUES ('IMPORT', 1, 'COMPLETED', 'Simulated 42 invoices', NULL, '2026-10-13T10:00:00Z', '2026-10-13T10:00:05Z'),
			        ('IMPORT', 0, 'COMPLETED', 'Imported 42 invoices', NULL, '2026-10-13T11:00:00Z', '2026-10-13T11:00:05Z'),
			        ('UPDATE_PAID', 0, 'FAILED', 'Connection timeout', 'Timeout on ISP billing API', '2026-10-13T12:00:00Z', '2026-10-13T12:00:02Z')`
		)

		const runs = await getRecentRunsUseCase.execute()
		assert.equal(runs.length, 3)

		// Newest first
		assert.equal(runs[0]!.type, 'UPDATE_PAID')
		assert.equal(runs[0]!.status, 'FAILED')
		assert.equal(runs[0]!.isSimulation, false)
		assert.equal(runs[0]!.errorMessage, 'Timeout on ISP billing API')

		assert.equal(runs[1]!.type, 'IMPORT')
		assert.equal(runs[1]!.status, 'COMPLETED')
		assert.equal(runs[1]!.isSimulation, false)

		assert.equal(runs[2]!.type, 'IMPORT')
		assert.equal(runs[2]!.isSimulation, true)
	})

	it('returns run detail with items and aggregated counters', async () => {
		dbClient.execute(
			`INSERT INTO sync_run (id, type, is_simulation, status, summary, started_at, finished_at)
			 VALUES (1, 'IMPORT', 0, 'COMPLETED', '42 candidatas, 9 excluidas', '2026-10-13T10:00:00Z', '2026-10-13T10:00:05Z')`
		)

		dbClient.execute(
			`INSERT INTO sync_run_item (run_id, contract_id, installment_id, period, amount, result, reason)
			 VALUES (1, 900101, '1001', '2026-08', 25.00, 'IMPORTED', 'Imported successfully'),
			        (1, 900101, '1002', '2026-09', 25.00, 'IMPORTED', 'Imported successfully'),
			        (1, 900102, '1003', '2026-07', 30.00, 'EXCLUDED_STATUS', 'Contract status CORTESIA is not importable'),
			        (1, 900103, '1004', '2026-06', 0.00, 'RESIDUAL_DEBT', 'Installment balance is under 1 cent')`
		)

		const detail = await getRunDetailUseCase.execute(1)
		assert.ok(detail)
		assert.equal(detail.run.id, 1)
		assert.equal(detail.run.type, 'IMPORT')
		assert.equal(detail.items.length, 4)

		// Granular item fields
		assert.equal(detail.items[0]!.contractId, 900101)
		assert.equal(detail.items[0]!.installmentId, '1001')
		assert.equal(detail.items[0]!.result, 'IMPORTED')
		assert.equal(detail.items[2]!.result, 'EXCLUDED_STATUS')

		// Counters
		assert.equal(detail.counters['IMPORTED'], 2)
		assert.equal(detail.counters['EXCLUDED_STATUS'], 1)
		assert.equal(detail.counters['RESIDUAL_DEBT'], 1)
	})

	it('returns null when querying run detail for non-existent ID', async () => {
		const detail = await getRunDetailUseCase.execute(9999)
		assert.equal(detail, null)
	})
})
