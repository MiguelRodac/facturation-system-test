/**
 * Payment Domain Entities & Types (docs/ENUNCIADO.md §3.3, §4)
 *
 * Defines models and outcomes of payment reconciliation against ISP payment book.
 */

export type PaymentEvaluationResult =
	| 'PAID'
	| 'PARTIAL_PAYMENT'
	| 'STILL_OPEN'
	| 'NO_EVIDENCE'
	| 'EXONERATED'
	| 'INCONSISTENT_ROWS'

export interface PaymentEvaluationItem {
	readonly contractId: number
	readonly invoiceId: number
	readonly installmentId: string
	readonly period: string
	readonly previousBalance: number
	readonly newBalance: number
	readonly result: PaymentEvaluationResult
	readonly paidByInvoiceNumber?: string
	readonly paidAt?: string
	readonly reason?: string
}

export interface PaymentSummary {
	readonly totalContractsChecked: number
	readonly totalInvoicesEvaluated: number
	readonly paidInvoicesCount: number
	readonly paidAmount: number
	readonly partialPaymentsCount: number
	readonly items: readonly PaymentEvaluationItem[]
	readonly isSimulation: boolean
	readonly runId?: number
}
