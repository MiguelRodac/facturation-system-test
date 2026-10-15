/**
 * Import Repository Port (docs/ENUNCIADO.md §3.2, §3.4, §4)
 *
 * Defines the contract for persistence required by the Import feature.
 * Decoupled from any concrete SQL driver.
 */

import type { ImportConfig, InstallmentEvaluationItem } from './import.types.ts'

export type { ImportConfig, InstallmentEvaluationItem }

export interface CustomerData {
	readonly id: string
	readonly name: string
	readonly personType: 'NATURAL' | 'LEGAL'
	readonly email?: string
	readonly phone?: string
	readonly address?: string
	readonly origin?: string
	readonly createdAt?: string
}

export interface ContractData {
	readonly id: number
	readonly code: string
	readonly customerId: string
	readonly status: string
	readonly planName: string
	readonly planPrice: number
	readonly branchName?: string
}

export interface InvoiceData {
	readonly externalInstallmentId: string
	readonly contractId: number
	readonly customerId: string
	readonly period: string
	readonly dueDate: string
	readonly cutoffDate: string
	readonly totalAmount: number
	readonly balance: number
	readonly status: 'OPEN' | 'PAID'
	readonly importedAt: string
}

export interface SyncRunData {
	readonly type: 'IMPORT' | 'UPDATE_PAID'
	readonly isSimulation: boolean
	readonly status: 'COMPLETED' | 'FAILED'
	readonly summary: string
	readonly errorMessage?: string
	readonly startedAt: string
	readonly finishedAt: string
	readonly items: readonly InstallmentEvaluationItem[]
}

export interface ImportRepositoryPort {
	getConfig(): Promise<ImportConfig>
	isInvoiceImported(externalInstallmentId: string): Promise<boolean>
	saveCustomer(customer: CustomerData): Promise<void>
	saveContract(contract: ContractData): Promise<void>
	saveInvoice(invoice: InvoiceData): Promise<void>
	recordSyncRun(run: SyncRunData): Promise<number>
	withTransaction<T>(work: () => Promise<T>): Promise<T>
}
