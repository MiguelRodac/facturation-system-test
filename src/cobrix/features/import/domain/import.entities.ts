/**
 * Import Domain Entities (docs/ENUNCIADO.md §3.5, §3.6, §4)
 *
 * Core domain entities managed by the import bounded context.
 */

export interface CustomerEntity {
	readonly id: string
	readonly name: string
	readonly personType: 'NATURAL' | 'LEGAL'
	readonly email?: string
	readonly phone?: string
	readonly address?: string
	readonly origin?: string
	readonly createdAt?: string
}

export interface ContractEntity {
	readonly id: number
	readonly code: string
	readonly customerId: string
	readonly status: string
	readonly planName: string
	readonly planPrice: number
	readonly branchName?: string
	readonly createdAt?: string
}

export interface InvoiceEntity {
	readonly id?: number
	readonly externalInstallmentId: string
	readonly contractId: number
	readonly customerId: string
	readonly period: string
	readonly dueDate: string
	readonly cutoffDate: string
	readonly totalAmount: number
	readonly balance: number
	readonly status: 'OPEN' | 'PAID'
	readonly paidAt?: string
	readonly paidByInvoiceNumber?: string
	readonly isPartialPayment?: boolean
	readonly importedAt: string
}

export interface SyncRunEntity {
	readonly id?: number
	readonly type: 'IMPORT' | 'UPDATE_PAID'
	readonly isSimulation: boolean
	readonly status: 'COMPLETED' | 'FAILED'
	readonly summary: string
	readonly errorMessage?: string
	readonly startedAt: string
	readonly finishedAt: string
}

export interface SyncRunItemEntity {
	readonly id?: number
	readonly runId: number
	readonly contractId: number
	readonly installmentId: string
	readonly period: string
	readonly amount: number
	readonly result: string
	readonly reason?: string
}
