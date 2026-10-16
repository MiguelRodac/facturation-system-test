/**
 * Run Persistence Mapper
 * Maps between SQLite SyncRunRow / SyncRunItemRow and domain entities
 */

import type { SyncRunEntity, SyncRunItemEntity } from '../domain/runs.entities.ts'

export interface SyncRunRow {
	id: number
	type: 'IMPORT' | 'UPDATE_PAID'
	is_simulation: number
	status: 'COMPLETED' | 'FAILED'
	summary: string
	error_message: string | null
	started_at: string
	finished_at: string
}

export interface SyncRunItemRow {
	id: number
	run_id: number
	contract_id: number | null
	installment_id: string | null
	period: string | null
	amount: number | null
	result: string
	reason: string | null
}

export class RunMapper {
	static toRunEntity(row: SyncRunRow): SyncRunEntity {
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

	static toRunItemEntity(row: SyncRunItemRow): SyncRunItemEntity {
		return {
			id: row.id,
			runId: row.run_id,
			contractId: row.contract_id,
			installmentId: row.installment_id,
			period: row.period,
			amount: row.amount !== null ? Number(row.amount) : null,
			result: row.result,
			reason: row.reason,
		}
	}
}
