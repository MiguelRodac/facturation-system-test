/**
 * Domain Entities for Runs Feature (§3.4)
 */

export interface SyncRunEntity {
	readonly id: number
	readonly type: 'IMPORT' | 'UPDATE_PAID'
	readonly isSimulation: boolean
	readonly status: 'COMPLETED' | 'FAILED'
	readonly summary: string
	readonly errorMessage?: string | null
	readonly startedAt: string
	readonly finishedAt: string
}

export interface SyncRunItemEntity {
	readonly id: number
	readonly runId: number
	readonly contractId?: number | null
	readonly installmentId?: string | null
	readonly period?: string | null
	readonly amount?: number | null
	readonly result: string
	readonly reason?: string | null
}

export interface SyncRunDetail {
	readonly run: SyncRunEntity
	readonly items: readonly SyncRunItemEntity[]
	readonly counters: Record<string, number>
}
