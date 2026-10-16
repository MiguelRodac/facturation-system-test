/**
 * Test Connection Use Case (docs/ENUNCIADO.md §3.1)
 *
 * Tests live connection against ISP Billing API credentials.
 */

import { BillingApiClient } from '../../../shared/infrastructure/billing-api.client.ts'
import type { ConfigurationRepository } from '../domain/configuration.repository.ts'
import type { TestConnectionInput, TestConnectionResult } from '../domain/configuration.types.ts'

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

		const client = new BillingApiClient({
			baseUrl,
			username,
			password,
		})

		try {
			const res = await client.testConnection()
			return {
				ok: true,
				message: `Conexión exitosa con el proveedor. Se encontraron ${res.totalContracts} contratos disponibles.`,
				totalContracts: res.totalContracts,
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err)
			return {
				ok: false,
				message: `Error al conectar con la API: ${message}`,
			}
		}
	}
}
