/**
 * Use Case: Get Run Detail (§3.4)
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
