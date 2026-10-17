/**
 * Payment Evaluator Domain Service (docs/ENUNCIADO.md §3.3 & §4)
 *
 * Implements business rules for reconciling an open invoice against the ISP payment book:
 * - Check evidence in payment book (lacks evidence -> never marked paid)
 * - Row consistency (all rows for the installment must agree)
 * - Exoneration check (zero balance with zero payment is NOT a paid invoice)
 * - Paid qualification (balance is 0 and amountPaid > 0)
 * - Partial payment detection (balance > 0 but less than Cobrix recorded balance)
 */

import type { PaymentBookRow } from './payment-billing-api.port.ts'
import type { OpenInvoiceRecord, PaymentEvaluationItem } from './payment.entities.ts'

export class PaymentEvaluatorService {
	/**
	 * Filters payment book rows belonging to a specific installment.
	 */
	static getInstallmentRows(
		bookRows: readonly PaymentBookRow[],
		installmentId: string,
	): readonly PaymentBookRow[] {
		return bookRows.filter(r => String(r.installmentId) === String(installmentId))
	}

	/**
	 * Validates that all payment book rows for an installment are consistent with each other.
	 * docs/ENUNCIADO.md §4: "todas las filas de su cuota coinciden entre sí"
	 */
	static areRowsConsistent(rows: readonly PaymentBookRow[]): boolean {
		if (rows.length <= 1) return true
		const first = rows[0]!
		return rows.every(
			r => r.remainingBalance === first.remainingBalance && r.amountPaid === first.amountPaid,
		)
	}

	/**
	 * Checks if installment was exonerated (balance 0 with no payment).
	 * docs/ENUNCIADO.md §4: "Una cuota exonerada (saldo 0 sin nada pagado) no es un pago."
	 */
	static isExonerated(rows: readonly PaymentBookRow[]): boolean {
		if (rows.length === 0) return false
		const latest = rows[rows.length - 1]!
		return latest.remainingBalance <= 0 && latest.amountPaid <= 0
	}

	/**
	 * Evaluates an open invoice against its matching rows in the payment book.
	 */
	static evaluate(
		invoice: OpenInvoiceRecord,
		contractBookRows: readonly PaymentBookRow[],
	): PaymentEvaluationItem {
		const matchingRows = this.getInstallmentRows(contractBookRows, invoice.externalInstallmentId)

		// 1. No evidence in payment book
		if (matchingRows.length === 0) {
			return {
				contractId: invoice.contractId,
				invoiceId: invoice.id,
				installmentId: invoice.externalInstallmentId,
				period: invoice.period,
				previousBalance: invoice.balance,
				newBalance: invoice.balance,
				result: 'NO_EVIDENCE',
				reason: 'Installment not found in payment book',
			}
		}

		// 2. Consistency check across rows
		if (!this.areRowsConsistent(matchingRows)) {
			return {
				contractId: invoice.contractId,
				invoiceId: invoice.id,
				installmentId: invoice.externalInstallmentId,
				period: invoice.period,
				previousBalance: invoice.balance,
				newBalance: invoice.balance,
				result: 'INCONSISTENT_ROWS',
				reason: 'Inconsistent balance or paid values among payment book rows',
			}
		}

		// 3. Exoneration check
		if (this.isExonerated(matchingRows)) {
			return {
				contractId: invoice.contractId,
				invoiceId: invoice.id,
				installmentId: invoice.externalInstallmentId,
				period: invoice.period,
				previousBalance: invoice.balance,
				newBalance: invoice.balance,
				result: 'EXONERATED',
				reason: 'Zero balance without payment (exoneration is not a payment)',
			}
		}

		const latestRow = matchingRows[matchingRows.length - 1]!
		const remainingBalance = Math.round(latestRow.remainingBalance * 100) / 100
		const amountPaid = Math.round(latestRow.amountPaid * 100) / 100

		// Find latest valid receipt with num_factura
		const validReceipt = [...matchingRows].reverse().find(r => r.receiptNumber && r.receiptNumber.trim() !== '')

		// 3.5 Reopening check: If invoice was already PAID in Cobrix, verify if debt was restored via annulment
		if (invoice.status === 'PAID') {
			if (remainingBalance > 0) {
				return {
					contractId: invoice.contractId,
					invoiceId: invoice.id,
					installmentId: invoice.externalInstallmentId,
					period: invoice.period,
					previousBalance: 0,
					newBalance: remainingBalance,
					result: 'REOPENED',
					reason: 'Payment was annulled in ISP cashier; invoice reopened with restored balance',
				}
			}
			return {
				contractId: invoice.contractId,
				invoiceId: invoice.id,
				installmentId: invoice.externalInstallmentId,
				period: invoice.period,
				previousBalance: 0,
				newBalance: 0,
				result: 'PAID',
				reason: 'Invoice remains fully paid in ISP',
			}
		}

		// 4. Paid check: balance <= 0 and something was paid
		if (remainingBalance <= 0 && amountPaid > 0) {
			return {
				contractId: invoice.contractId,
				invoiceId: invoice.id,
				installmentId: invoice.externalInstallmentId,
				period: invoice.period,
				previousBalance: invoice.balance,
				newBalance: 0,
				result: 'PAID',
				paidByInvoiceNumber: validReceipt?.receiptNumber ?? latestRow.receiptNumber,
				paidAt: validReceipt?.receiptEmissionDate ?? latestRow.receiptEmissionDate,
			}
		}

		// 5. Partial payment check: balance > 0 but strictly less than Cobrix recorded balance
		if (remainingBalance > 0 && remainingBalance < invoice.balance) {
			return {
				contractId: invoice.contractId,
				invoiceId: invoice.id,
				installmentId: invoice.externalInstallmentId,
				period: invoice.period,
				previousBalance: invoice.balance,
				newBalance: remainingBalance,
				result: 'PARTIAL_PAYMENT',
				reason: `Partial payment detected (balance reduced from ${invoice.balance} to ${remainingBalance})`,
			}
		}

		// 6. Still open (no payment or debt restored after annulment)
		return {
			contractId: invoice.contractId,
			invoiceId: invoice.id,
			installmentId: invoice.externalInstallmentId,
			period: invoice.period,
			previousBalance: invoice.balance,
			newBalance: invoice.balance,
			result: 'STILL_OPEN',
			reason: 'Invoice remains open with unchanged balance',
		}
	}
}
