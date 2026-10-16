/**
 * Invoice Persistence Mapper
 * Maps between SQLite InvoiceRow and InvoiceEntity domain model
 */

import type { CustomerInvoiceSummary, InvoiceEntity } from '../domain/invoice.entity.ts'

export interface InvoiceRow {
	id: number
	external_installment_id: string
	contract_id: number
	customer_id: string
	period: string
	due_date: string
	cutoff_date: string
	total_amount: number
	balance: number
	status: 'OPEN' | 'PAID'
	paid_at: string | null
	paid_by_invoice_number: string | null
	is_partial_payment: number
	imported_at: string
}

export interface SummaryRow {
	customer_id: string
	open_count: number
	paid_count: number
	total_debt: number
	oldest_due_date: string | null
}

export class InvoiceMapper {
	static toDomain(r: InvoiceRow): InvoiceEntity {
		return {
			id: r.id,
			externalInstallmentId: r.external_installment_id,
			contractId: r.contract_id,
			customerId: r.customer_id,
			period: r.period,
			dueDate: r.due_date,
			cutoffDate: r.cutoff_date,
			totalAmount: Number(r.total_amount),
			balance: Number(r.balance),
			status: r.status,
			paidAt: r.paid_at,
			paidByInvoiceNumber: r.paid_by_invoice_number,
			isPartialPayment: Boolean(r.is_partial_payment),
			importedAt: r.imported_at,
		}
	}

	static toSummaryDomain(r: SummaryRow): CustomerInvoiceSummary {
		return {
			customerId: r.customer_id,
			openCount: Number(r.open_count),
			paidCount: Number(r.paid_count),
			totalDebt: Math.round(Number(r.total_debt) * 100) / 100,
			oldestDueDate: r.oldest_due_date,
		}
	}
}
