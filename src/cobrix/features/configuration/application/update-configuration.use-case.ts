/**
 * Update Configuration Use Case (docs/ENUNCIADO.md §3.1)
 */

import type { ConfigurationEntity } from '../domain/configuration.entity.ts'
import type { ConfigurationRepository } from '../domain/configuration.repository.ts'
import type { UpdateConfigurationInput } from '../domain/configuration.types.ts'

export class UpdateConfigurationUseCase {
	private readonly repo: ConfigurationRepository

	constructor(repo: ConfigurationRepository) {
		this.repo = repo
	}

	async execute(input: UpdateConfigurationInput): Promise<ConfigurationEntity> {
		return this.repo.update(input)
	}
}
