/**
 * Get Recent Runs Use Case (§3.4)
 * Single Responsibility: Retrieve list of recent synchronization runs
 */

import type { RunsRepositoryPort, SyncRunEntity } from '../domain/index.ts'

export class GetRecentRunsUseCase {
	private readonly runsRepository: RunsRepositoryPort

	constructor(runsRepository: RunsRepositoryPort) {
		this.runsRepository = runsRepository
	}

	async execute(limit = 20): Promise<SyncRunEntity[]> {
		return this.runsRepository.getRecentRuns(limit)
	}
}
