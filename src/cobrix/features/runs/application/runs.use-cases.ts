/**
 * Consolidated Runs Use Cases (§3.4)
 * Matching pattern from myintelli-global-api (entity.use-cases.ts)
 */

import type { RunsRepositoryPort, SyncRunDetail, SyncRunEntity } from '../domain/index.ts'

export class GetRecentRunsUseCase {
	private readonly runsRepository: RunsRepositoryPort

	constructor(runsRepository: RunsRepositoryPort) {
		this.runsRepository = runsRepository
	}

	async execute(limit = 20): Promise<SyncRunEntity[]> {
		return this.runsRepository.getRecentRuns(limit)
	}
}

export class GetRunDetailUseCase {
	private readonly runsRepository: RunsRepositoryPort

	constructor(runsRepository: RunsRepositoryPort) {
		this.runsRepository = runsRepository
	}

	async execute(runId: number): Promise<SyncRunDetail | null> {
		return this.runsRepository.getRunDetail(runId)
	}
}
