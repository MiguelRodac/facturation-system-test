/**
 * Import Application Factories (docs/ENUNCIADO.md §3.5, §4, §5)
 *
 * Encapsulates the instantiation and data transformation of domain models
 * from raw external billing representations:
 * - CustomerFactory: parses identification, infers personType, normalizes IDs
 * - ContractFactory: links contract data to customer ID
 * - InvoiceFactory: converts candidate installment to domain InvoiceEntity
 */

import { Identification } from '../../../shared/domain/identification.vo.ts'
import type {
	ContractEntity,
	CustomerEntity,
	InvoiceEntity,
} from '../domain/import.entities.ts'
import type { ImportableContract } from '../domain/billing-api.port.ts'
import type { CandidateInstallment } from '../domain/import.types.ts'

export class CustomerFactory {
	static createFromContract(contract: ImportableContract, createdAt?: string): CustomerEntity {
		const identification = Identification.parse(contract.holderTaxId)
		return {
			id: identification.normalized,
			name: contract.holderName,
			personType: identification.personType,
			email: contract.email,
			phone: contract.phone,
			address: contract.address,
			origin: 'ISP',
			createdAt,
		}
	}
}

export class ContractFactory {
	static createFromContract(
		contract: ImportableContract,
		customerId: string,
		createdAt?: string,
	): ContractEntity {
		return {
			id: contract.contractId,
			code: contract.code,
			customerId,
			status: contract.status,
			planName: contract.planName,
			planPrice: contract.planPrice,
			branchName: contract.branchName,
			createdAt,
		}
	}
}

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
