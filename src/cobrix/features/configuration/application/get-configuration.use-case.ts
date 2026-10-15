/**
 * Get Configuration Use Case (docs/ENUNCIADO.md §3.1)
 *
 * Retrieves current active configuration parameters for Cobrix.
 */

import type { ConfigurationEntity } from '../domain/configuration.entity.ts'
import type { ConfigurationRepository } from '../domain/configuration.repository.ts'

export class GetConfigurationUseCase {
	private readonly repo: ConfigurationRepository

	constructor(repo: ConfigurationRepository) {
		this.repo = repo
	}

	async execute(): Promise<ConfigurationEntity> {
		return this.repo.get()
	}
}
