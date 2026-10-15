/**
 * Domain Entities for Customers Feature (§3.5 & §3.6)
 */

export interface CustomerSummaryEntity {
	readonly id: string
	readonly name: string
	readonly personType: 'NATURAL' | 'LEGAL'
	readonly contractsCount: number
	readonly openInvoicesCount: number
	readonly paidInvoicesCount: number
	readonly totalDebt: number
	readonly oldestDueDate: string | null
}

export interface CustomerProfileEntity {
	readonly id: string
	readonly name: string
	readonly personType: 'NATURAL' | 'LEGAL'
	readonly email?: string | null
	readonly phone?: string | null
	readonly address?: string | null
	readonly origin: string
	readonly createdAt: string
}

export interface CustomerContractEntity {
	readonly id: number
	readonly code: string
	readonly status: string
	readonly planName: string
	readonly planPrice: number
	readonly branchName?: string | null
}

export interface CustomerInvoiceEntity {
	readonly id: number
	readonly externalInstallmentId: string
	readonly contractId: number
	readonly period: string
	readonly dueDate: string
	readonly cutoffDate: string
	readonly totalAmount: number
	readonly balance: number
	readonly status: 'OPEN' | 'PAID'
	readonly isPartialPayment: boolean
	readonly paidAt?: string | null
	readonly paidByInvoiceNumber?: string | null
	readonly importedAt: string
}

export interface CustomerTimelineEvent {
	readonly date: string
	readonly title: string
	readonly description: string
	readonly tone: 'ok' | 'info' | 'warn' | 'mute'
}

export interface CustomerDossierEntity {
	readonly profile: CustomerProfileEntity
	readonly contracts: readonly CustomerContractEntity[]
	readonly invoices: readonly CustomerInvoiceEntity[]
	readonly totals: {
		readonly totalDebt: number
		readonly openCount: number
		readonly paidCount: number
		readonly contractsCount: number
	}
	readonly timeline: readonly CustomerTimelineEvent[]
}
