/**
 * Get Run Detail Use Case (§3.4)
 * Single Responsibility: Retrieve detailed itemized execution log and counters for a run
 */

import type { RunsRepositoryPort, SyncRunDetail } from '../domain/index.ts'

export class GetRunDetailUseCase {
	private readonly runsRepository: RunsRepositoryPort

	constructor(runsRepository: RunsRepositoryPort) {
		this.runsRepository = runsRepository
	}

	async execute(runId: number): Promise<SyncRunDetail | null> {
		return this.runsRepository.getRunDetail(runId)
	}
}
