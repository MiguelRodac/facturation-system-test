/**
 * SQLite Implementation for RunsRepositoryPort (§3.4)
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { RunsRepositoryPort, SyncRunDetail, SyncRunEntity, SyncRunItemEntity } from '../domain/index.ts'
import { RunMapper, type SyncRunItemRow, type SyncRunRow } from './run.mapper.ts'

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

		return rows.map(RunMapper.toRunEntity)
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

		const items: SyncRunItemEntity[] = itemRows.map(RunMapper.toRunItemEntity)

		const counters: Record<string, number> = {}
		for (const item of items) {
			counters[item.result] = (counters[item.result] ?? 0) + 1
		}

		return {
			run: RunMapper.toRunEntity(runRow),
			items,
			counters,
		}
	}
}
