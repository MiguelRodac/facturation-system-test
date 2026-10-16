/**
 * Payment Persistence Mapper
 * Maps between SQLite InvoiceRow and OpenInvoiceRecord domain model
 */

import type { OpenInvoiceRecord } from '../domain/payment.entities.ts'

export interface PaymentInvoiceRow {
	id: number
	external_installment_id: string
	contract_id: number
	customer_id: string
	period: string
	total_amount: number
	balance: number
	status: 'OPEN' | 'PAID'
}

export class PaymentMapper {
	static toOpenInvoiceRecord(row: PaymentInvoiceRow): OpenInvoiceRecord {
		return {
			id: row.id,
			externalInstallmentId: row.external_installment_id,
			contractId: row.contract_id,
			customerId: row.customer_id,
			period: row.period,
			totalAmount: Number(row.total_amount),
			balance: Number(row.balance),
			status: row.status,
		}
	}
}
