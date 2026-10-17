/**
 * Reset Sync Data Use Case
 *
 * Clears all imported invoices, contracts, customers, and sync execution logs.
 * Preserves company_config configuration.
 */

import type { ImportRepositoryPort } from '../domain/import.repository.ts'

export interface ResetSyncDataResult {
	readonly cleared: boolean
	readonly ispReset?: boolean
	readonly message: string
}

export class ResetSyncDataUseCase {
	private readonly repo: ImportRepositoryPort
	private readonly resetIspCallback?: () => Promise<boolean>

	constructor(repo: ImportRepositoryPort, resetIspCallback?: () => Promise<boolean>) {
		this.repo = repo
		this.resetIspCallback = resetIspCallback
	}

	async execute(): Promise<ResetSyncDataResult> {
		await this.repo.resetData()
		let ispReset = false
		if (this.resetIspCallback) {
			try {
				ispReset = await this.resetIspCallback()
			} catch (err) {
				console.warn('⚠️ No se pudo reiniciar el simulador del ISP:', err)
			}
		}
		return {
			cleared: true,
			ispReset,
			message: ispReset
				? 'Base de datos de Cobrix e ISP reiniciadas a estado cero correctamente.'
				: 'Base de datos de Cobrix reiniciada a estado cero correctamente.',
		}
	}
}
