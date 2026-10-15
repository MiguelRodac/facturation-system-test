/**
 * Repository Port for Runs Feature (§3.4)
 */

import type { SyncRunDetail, SyncRunEntity } from './runs.entities.ts'

export interface RunsRepositoryPort {
	getRecentRuns(limit?: number): Promise<SyncRunEntity[]>
	getRunDetail(runId: number): Promise<SyncRunDetail | null>
}
