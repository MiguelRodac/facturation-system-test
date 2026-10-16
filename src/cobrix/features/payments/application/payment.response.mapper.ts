/**
 * Payment Response Mapper
 * Formats PaymentSummary into JSON DTO responses
 */

import type { PaymentSummary } from '../domain/payment.entities.ts'

export interface PaymentSummaryDto {
	is_simulation: boolean
	total_contracts_checked: number
	total_invoices_evaluated: number
	paid_invoices_count: number
	paid_amount: number
	partial_payments_count: number
	items_count: number
}

export class PaymentResponseMapper {
	static toDto(summary: PaymentSummary): PaymentSummaryDto {
		return {
			is_simulation: summary.isSimulation,
			total_contracts_checked: summary.totalContractsChecked,
			total_invoices_evaluated: summary.totalInvoicesEvaluated,
			paid_invoices_count: summary.paidInvoicesCount,
			paid_amount: summary.paidAmount,
			partial_payments_count: summary.partialPaymentsCount,
			items_count: summary.items.length,
		}
	}
}
