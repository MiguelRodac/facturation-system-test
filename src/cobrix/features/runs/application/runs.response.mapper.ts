/**
 * Runs Response Mapper
 * Formats SyncRunEntity and SyncRunDetail into JSON DTO responses
 */

import type { SyncRunDetail, SyncRunEntity } from '../domain/runs.entities.ts'

export interface SyncRunDto {
	id: number
	type: 'IMPORT' | 'UPDATE_PAID'
	is_simulation: boolean
	status: 'COMPLETED' | 'FAILED'
	summary: string
	error_message: string | null
	started_at: string
	finished_at: string
}

export interface SyncRunDetailDto {
	run: SyncRunDto
	counters: Record<string, number>
	items: Array<{
		id: number
		run_id: number
		contract_id: number | null
		installment_id: string | null
		period: string | null
		amount: number | null
		result: string
		reason: string | null
	}>
}

export class RunsResponseMapper {
	static toRunDto(entity: SyncRunEntity): SyncRunDto {
		return {
			id: entity.id,
			type: entity.type,
			is_simulation: entity.isSimulation,
			status: entity.status,
			summary: entity.summary,
			error_message: entity.errorMessage ?? null,
			started_at: entity.startedAt,
			finished_at: entity.finishedAt,
		}
	}

	static toRunDetailDto(detail: SyncRunDetail): SyncRunDetailDto {
		return {
			run: this.toRunDto(detail.run),
			counters: detail.counters,
			items: detail.items.map(item => ({
				id: item.id,
				run_id: item.runId,
				contract_id: item.contractId ?? null,
				installment_id: item.installmentId ?? null,
				period: item.period ?? null,
				amount: item.amount ?? null,
				result: item.result,
				reason: item.reason ?? null,
			})),
		}
	}
}
