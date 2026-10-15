/**
 * Payment Repository Port (docs/ENUNCIADO.md §3.3, §3.4)
 *
 * Defines persistence operations for reading open invoices and updating reconciled payments.
 */

import type { PaymentEvaluationItem } from './payment.entities.ts'

export interface OpenInvoiceRecord {
	readonly id: number
	readonly externalInstallmentId: string
	readonly contractId: number
	readonly customerId: string
	readonly period: string
	readonly totalAmount: number
	readonly balance: number
	readonly status: 'OPEN' | 'PAID'
}

export interface RecordPaymentSyncRunInput {
	readonly isSimulation: boolean
	readonly status: 'COMPLETED' | 'FAILED'
	readonly summary: string
	readonly errorMessage?: string
	readonly startedAt: string
	readonly finishedAt: string
	readonly items: readonly PaymentEvaluationItem[]
}

export interface PaymentRepositoryPort {
	getContractsWithOpenInvoices(): Promise<readonly number[]>
	getOpenInvoicesByContract(contractId: number): Promise<readonly OpenInvoiceRecord[]>
	markInvoicePaid(
		invoiceId: number,
		paidByInvoiceNumber: string,
		paidAt: string,
	): Promise<void>
	updateInvoicePartialPayment(invoiceId: number, newBalance: number): Promise<void>
	recordSyncRun(run: RecordPaymentSyncRunInput): Promise<number>
}
