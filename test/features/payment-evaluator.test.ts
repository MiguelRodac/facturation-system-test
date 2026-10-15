import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
	PaymentEvaluatorService,
	type OpenInvoiceRecord,
	type PaymentBookRow,
} from '../../src/cobrix/features/payments/index.ts'

describe('Domain Service: PaymentEvaluatorService (§3.3 & §4)', () => {
	const mockInvoice: OpenInvoiceRecord = {
		id: 1,
		externalInstallmentId: '7000008',
		contractId: 900101,
		customerId: 'V12345678',
		period: '2026-08',
		totalAmount: 25.0,
		balance: 25.0,
		status: 'OPEN',
	}

	it('qualifies an invoice as PAID when balance is 0 and amountPaid > 0', () => {
		const bookRows: PaymentBookRow[] = [
			{
				installmentId: '7000008',
				period: '2026-08',
				fee: 25.0,
				amountPaid: 25.0,
				remainingBalance: 0.0,
				discount: 0,
				receiptId: 8800001,
				receiptNumber: '008800001',
				receiptEmissionDate: '2026-10-13',
			},
		]

		const result = PaymentEvaluatorService.evaluate(mockInvoice, bookRows)
		assert.equal(result.result, 'PAID')
		assert.equal(result.newBalance, 0)
		assert.equal(result.paidByInvoiceNumber, '008800001')
		assert.equal(result.paidAt, '2026-10-13')
	})

	it('detects PARTIAL_PAYMENT when remaining balance is less than Cobrix balance', () => {
		const bookRows: PaymentBookRow[] = [
			{
				installmentId: '7000008',
				period: '2026-08',
				fee: 25.0,
				amountPaid: 10.0,
				remainingBalance: 15.0,
				discount: 0,
				receiptId: 8800002,
				receiptNumber: '008800002',
				receiptEmissionDate: '2026-10-13',
			},
		]

		const result = PaymentEvaluatorService.evaluate(mockInvoice, bookRows)
		assert.equal(result.result, 'PARTIAL_PAYMENT')
		assert.equal(result.previousBalance, 25.0)
		assert.equal(result.newBalance, 15.0)
	})

	it('marks EXONERATED and leaves open when balance is 0 but amountPaid is 0', () => {
		const bookRows: PaymentBookRow[] = [
			{
				installmentId: '7000008',
				period: '2026-08',
				fee: 25.0,
				amountPaid: 0.0,
				remainingBalance: 0.0,
				discount: 25.0,
				receiptId: 0,
				receiptNumber: '',
				receiptEmissionDate: '2026-10-13',
			},
		]

		const result = PaymentEvaluatorService.evaluate(mockInvoice, bookRows)
		assert.equal(result.result, 'EXONERATED')
		assert.equal(result.newBalance, 25.0)
	})

	it('returns NO_EVIDENCE when installment does not appear in payment book', () => {
		const result = PaymentEvaluatorService.evaluate(mockInvoice, [])
		assert.equal(result.result, 'NO_EVIDENCE')
		assert.equal(result.newBalance, 25.0)
	})

	it('detects INCONSISTENT_ROWS when multiple rows for the same installment disagree', () => {
		const bookRows: PaymentBookRow[] = [
			{
				installmentId: '7000008',
				period: '2026-08',
				fee: 25.0,
				amountPaid: 25.0,
				remainingBalance: 0.0,
				discount: 0,
				receiptId: 8800001,
				receiptNumber: '008800001',
				receiptEmissionDate: '2026-10-13',
			},
			{
				installmentId: '7000008',
				period: '2026-08',
				fee: 25.0,
				amountPaid: 10.0,
				remainingBalance: 15.0,
				discount: 0,
				receiptId: 8800002,
				receiptNumber: '008800002',
				receiptEmissionDate: '2026-10-13',
			},
		]

		const result = PaymentEvaluatorService.evaluate(mockInvoice, bookRows)
		assert.equal(result.result, 'INCONSISTENT_ROWS')
	})

	it('returns STILL_OPEN when payment book shows full balance still due', () => {
		const bookRows: PaymentBookRow[] = [
			{
				installmentId: '7000008',
				period: '2026-08',
				fee: 25.0,
				amountPaid: 0.0,
				remainingBalance: 25.0,
				discount: 0,
				receiptId: 0,
				receiptNumber: '',
				receiptEmissionDate: '2026-10-13',
			},
		]

		const result = PaymentEvaluatorService.evaluate(mockInvoice, bookRows)
		assert.equal(result.result, 'STILL_OPEN')
	})
})
