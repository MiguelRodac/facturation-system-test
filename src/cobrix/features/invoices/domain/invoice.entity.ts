/**
 * Invoice Entity & Summary
 * Belongs exclusively to the invoices feature
 */

export interface InvoiceEntity {
	id?: number
	externalInstallmentId: string
	contractId: number
	customerId: string
	period: string
	dueDate: string
	cutoffDate: string
	totalAmount: number
	balance: number
	status: 'OPEN' | 'PAID'
	paidAt?: string | null
	paidByInvoiceNumber?: string | null
	isPartialPayment?: boolean
	importedAt: string
}

export interface CustomerInvoiceSummary {
	customerId: string
	openCount: number
	paidCount: number
	totalDebt: number
	oldestDueDate: string | null
}
