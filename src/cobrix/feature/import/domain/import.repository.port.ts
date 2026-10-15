/**
 * Import Repository Port (docs/ENUNCIADO.md §3.2, §3.4, §4)
 *
 * Defines persistence requirements for the Import feature.
 * Consumes pure shared domain entities.
 */

import type {
	ContractEntity,
	CustomerEntity,
	InvoiceEntity,
} from '../../../shared/domain/entities.ts'
import type { ImportConfig, InstallmentEvaluationItem } from './import.types.ts'

export interface RecordSyncRunInput {
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
	saveCustomer(customer: CustomerEntity): Promise<void>
	saveContract(contract: ContractEntity): Promise<void>
	saveInvoice(invoice: InvoiceEntity): Promise<void>
	recordSyncRun(run: RecordSyncRunInput): Promise<number>
	withTransaction<T>(work: () => Promise<T>): Promise<T>
}
