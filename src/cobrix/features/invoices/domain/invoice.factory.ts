/**
 * Invoice Factory
 * Encapsulates instantiation and business defaults of InvoiceEntity
 */

import type { InvoiceEntity } from './invoice.entity.ts'

export interface CreateInvoiceCandidateParams {
	readonly installmentId: string
	readonly period: { code: string }
	readonly dueDate: string
	readonly cutoffDate: string
	readonly money: { dollars: number }
}

export class InvoiceFactory {
	static createFromCandidate(
		candidate: CreateInvoiceCandidateParams,
		contractId: number,
		customerId: string,
		importedAt: string = new Date().toISOString(),
	): InvoiceEntity {
		return {
			externalInstallmentId: candidate.installmentId,
			contractId,
			customerId,
			period: candidate.period.code,
			dueDate: candidate.dueDate,
			cutoffDate: candidate.cutoffDate,
			totalAmount: candidate.money.dollars,
			balance: candidate.money.dollars,
			status: 'OPEN',
			isPartialPayment: false,
			paidAt: null,
			paidByInvoiceNumber: null,
			importedAt,
		}
	}
}
