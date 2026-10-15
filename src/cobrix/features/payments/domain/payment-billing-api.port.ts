/**
 * Payment Billing API Port (docs/API.md §3.4)
 *
 * Defines contract for retrieving payment book records from ISP.
 */

export interface PaymentBookRow {
	readonly installmentId: string
	readonly period: string
	readonly fee: number
	readonly amountPaid: number
	readonly remainingBalance: number
	readonly discount: number
	readonly receiptId: number
	readonly receiptNumber: string
	readonly receiptEmissionDate: string
}

export interface PaymentBillingApiPort {
	fetchPaymentBook(contractId: number): Promise<readonly PaymentBookRow[]>
}
