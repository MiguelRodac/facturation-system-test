/**
 * Update Configuration Use Case (docs/ENUNCIADO.md §3.1)
 *
 * Persists modifications to sync parameters and thresholds.
 */

import type { ConfigurationEntity } from '../domain/configuration.entity.ts'
import type { ConfigurationRepository } from '../domain/configuration.repository.ts'

export class UpdateConfigurationUseCase {
	private readonly repo: ConfigurationRepository

	constructor(repo: ConfigurationRepository) {
		this.repo = repo
	}

	async execute(patch: Partial<ConfigurationEntity>): Promise<ConfigurationEntity> {
		return this.repo.update(patch)
	}
}
