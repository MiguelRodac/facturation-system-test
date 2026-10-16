/**
 * Import Repository Port (docs/ENUNCIADO.md §3.2, §3.4, §3.6)
 *
 * Defines persistence operations required for importing customers, contracts, and invoices.
 */

import type { CustomerEntity } from '../../customers/domain/customer.entities.ts'
import type { ContractEntity } from '../../contracts/domain/contract.entity.ts'
import type { InvoiceEntity } from '../../invoices/domain/invoice.entity.ts'
import type { InstallmentEvaluationItem } from './import.types.ts'

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
	isInvoiceImported(externalInstallmentId: string): Promise<boolean>
	saveCustomer(customer: CustomerEntity): Promise<void>
	saveContract(contract: ContractEntity): Promise<void>
	saveInvoice(invoice: InvoiceEntity): Promise<void>
	recordSyncRun(run: RecordSyncRunInput): Promise<number>
	withTransaction<T>(work: () => Promise<T>): Promise<T>
}
