/**
 * Consolidated Configuration Use Cases (docs/ENUNCIADO.md §3.1)
 * Matching pattern from myintelli-global-api (entity.use-cases.ts)
 */

import { BillingApiClient } from '../../../shared/infrastructure/billing-api.client.ts'
import type { ConfigurationEntity } from '../domain/configuration.entity.ts'
import type { ConfigurationRepository } from '../domain/configuration.repository.ts'

export interface TestConnectionInput {
	apiUrl?: string
	apiUser?: string
	apiPassword?: string
}

export interface TestConnectionResult {
	ok: boolean
	message: string
	statusCode?: number
}

export class GetConfigurationUseCase {
	private readonly repo: ConfigurationRepository

	constructor(repo: ConfigurationRepository) {
		this.repo = repo
	}

	async execute(): Promise<ConfigurationEntity> {
		return this.repo.get()
	}
}

export class UpdateConfigurationUseCase {
	private readonly repo: ConfigurationRepository

	constructor(repo: ConfigurationRepository) {
		this.repo = repo
	}

	async execute(patch: Partial<ConfigurationEntity>): Promise<ConfigurationEntity> {
		return this.repo.update(patch)
	}
}

export class TestConnectionUseCase {
	private readonly repo: ConfigurationRepository

	constructor(repo: ConfigurationRepository) {
		this.repo = repo
	}

	async execute(input?: TestConnectionInput): Promise<TestConnectionResult> {
		const config = await this.repo.get()
		const baseUrl = input?.apiUrl || config.apiUrl
		const username = input?.apiUser || config.apiUser
		const password = input?.apiPassword || config.apiPassword

		try {
			const client = new BillingApiClient({
				baseUrl,
				username,
				password,
			})
			await client.getToken()
			return {
				ok: true,
				message: 'Conexión exitosa con la API del ISP (Token obtenido)',
				statusCode: 200,
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			return {
				ok: false,
				message: `Fallo de conexión: ${message}`,
				statusCode: 401,
			}
		}
	}
}
