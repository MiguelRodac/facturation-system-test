/**
 * Configuration Domain Types
 */

import type { ConfigurationEntity } from './configuration.entity.ts'

export type UpdateConfigurationInput = {
	-readonly [K in keyof Omit<ConfigurationEntity, 'id'>]?: ConfigurationEntity[K]
}

export interface TestConnectionInput {
	apiUrl?: string
	apiUser?: string
	apiPassword?: string
}

export interface TestConnectionResult {
	ok: boolean
	message: string
	totalContracts?: number
}
