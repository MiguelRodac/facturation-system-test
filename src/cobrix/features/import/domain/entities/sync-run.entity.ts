/**
 * Sync Run Domain Entity (docs/ENUNCIADO.md §3.6)
 *
 * Audit trail recording each import execution or payment update run with its line items.
 */

export interface SyncRunEntity {
	readonly id?: number
	readonly type: 'IMPORT' | 'UPDATE_PAID'
	readonly isSimulation: boolean
	readonly status: 'COMPLETED' | 'FAILED'
	readonly summary: string
	readonly errorMessage?: string
	readonly startedAt: string
	readonly finishedAt: string
}

export interface SyncRunItemEntity {
	readonly id?: number
	readonly runId: number
	readonly contractId: number
	readonly installmentId: string
	readonly period: string
	readonly amount: number
	readonly result: string
	readonly reason?: string
}
