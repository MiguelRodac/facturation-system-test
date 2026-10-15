/**
 * Configuration Repository Port (docs/ENUNCIADO.md §3.1)
 *
 * Defines contract for retrieving and persisting Cobrix company configuration.
 */

import type { ConfigurationEntity } from './configuration.entity.ts'

export interface ConfigurationRepository {
	get(): Promise<ConfigurationEntity>
	update(patch: Partial<ConfigurationEntity>): Promise<ConfigurationEntity>
}
