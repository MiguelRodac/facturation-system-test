/**
 * SQLite Implementation for RunsRepositoryPort (§3.4)
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { RunsRepositoryPort, SyncRunDetail, SyncRunEntity, SyncRunItemEntity } from '../domain/index.ts'

interface SyncRunRow {
	id: number
	type: 'IMPORT' | 'UPDATE_PAID'
	is_simulation: number
	status: 'COMPLETED' | 'FAILED'
	summary: string
	error_message: string | null
	started_at: string
	finished_at: string
}

interface SyncRunItemRow {
	id: number
	run_id: number
	contract_id: number | null
	installment_id: string | null
	period: string | null
	amount: number | null
	result: string
	reason: string | null
}

export class SqliteRunsRepository implements RunsRepositoryPort {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async getRecentRuns(limit = 20): Promise<SyncRunEntity[]> {
		const rows = this.db.query<SyncRunRow>(
			`SELECT id, type, is_simulation, status, summary, error_message, started_at, finished_at
			 FROM sync_run
			 ORDER BY started_at DESC, id DESC
			 LIMIT ?`,
			[limit]
		)

		return rows.map(row => this.mapRunRow(row))
	}

	async getRunDetail(runId: number): Promise<SyncRunDetail | null> {
		const runRow = this.db.queryOne<SyncRunRow>(
			`SELECT id, type, is_simulation, status, summary, error_message, started_at, finished_at
			 FROM sync_run
			 WHERE id = ?`,
			[runId]
		)

		if (!runRow) {
			return null
		}

		const itemRows = this.db.query<SyncRunItemRow>(
			`SELECT id, run_id, contract_id, installment_id, period, amount, result, reason
			 FROM sync_run_item
			 WHERE run_id = ?
			 ORDER BY id ASC`,
			[runId]
		)

		const items: SyncRunItemEntity[] = itemRows.map(row => ({
			id: row.id,
			runId: row.run_id,
			contractId: row.contract_id,
			installmentId: row.installment_id,
			period: row.period,
			amount: row.amount,
			result: row.result,
			reason: row.reason,
		}))

		const counters: Record<string, number> = {}
		for (const item of items) {
			counters[item.result] = (counters[item.result] ?? 0) + 1
		}

		return {
			run: this.mapRunRow(runRow),
			items,
			counters,
		}
	}

	private mapRunRow(row: SyncRunRow): SyncRunEntity {
		return {
			id: row.id,
			type: row.type,
			isSimulation: Boolean(row.is_simulation),
			status: row.status,
			summary: row.summary,
			errorMessage: row.error_message,
			startedAt: row.started_at,
			finishedAt: row.finished_at,
		}
	}
}
