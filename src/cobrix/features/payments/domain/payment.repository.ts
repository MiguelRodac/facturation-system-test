/**
 * Payment Repository Port (docs/ENUNCIADO.md §3.3, §3.4)
 *
 * Defines persistence operations for reading open invoices and updating reconciled payments.
 */

import type { OpenInvoiceRecord, PaymentEvaluationItem } from './payment.entities.ts'

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
	getContractsWithReconcilableInvoices?(): Promise<readonly number[]>
	getReconcilableInvoicesByContract?(contractId: number): Promise<readonly OpenInvoiceRecord[]>
	markInvoicePaid(
		invoiceId: number,
		paidByInvoiceNumber: string,
		paidAt: string,
	): Promise<void>
	updateInvoicePartialPayment(invoiceId: number, newBalance: number): Promise<void>
	reopenInvoice?(invoiceId: number, restoredBalance: number): Promise<void>
	recordSyncRun(run: RecordPaymentSyncRunInput): Promise<number>
}
