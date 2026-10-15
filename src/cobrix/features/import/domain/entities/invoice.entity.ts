/**
 * Invoice Domain Entity (docs/ENUNCIADO.md §3.5, §4)
 *
 * Represents an open or paid invoice in Cobrix derived from an external installment.
 */

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
