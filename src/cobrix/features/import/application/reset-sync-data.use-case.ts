/**
 * Reset Sync Data Use Case
 *
 * Clears all imported invoices, contracts, customers, and sync execution logs.
 * Preserves company_config configuration.
 */

import type { ImportRepositoryPort } from '../domain/import.repository.ts'

export interface ResetSyncDataResult {
	readonly cleared: boolean
	readonly message: string
}

export class ResetSyncDataUseCase {
	private readonly repo: ImportRepositoryPort

	constructor(repo: ImportRepositoryPort) {
		this.repo = repo
	}

	async execute(): Promise<ResetSyncDataResult> {
		await this.repo.resetData()
		return {
			cleared: true,
			message: 'Todos los datos importados (clientes, contratos, facturas y auditorías) han sido reseteados correctamente.',
		}
	}
}
