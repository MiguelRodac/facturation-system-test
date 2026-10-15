/**
 * Invoice Factory (docs/ENUNCIADO.md §3.5, §4)
 *
 * Encapsulates the instantiation of Invoice domain entities.
 */

import type { InvoiceEntity } from '../../domain/entities/invoice.entity.ts'
import type { CandidateInstallment } from '../../domain/import.types.ts'

export class InvoiceFactory {
	static createFromCandidate(
		candidate: CandidateInstallment,
		contractId: number,
		customerId: string,
		importedAt: string,
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
			importedAt,
		}
	}
}
