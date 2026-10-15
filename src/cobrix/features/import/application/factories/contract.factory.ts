/**
 * Contract Factory (docs/ENUNCIADO.md §3.5, §4)
 *
 * Encapsulates the instantiation of Contract domain entities.
 */

import type { ContractEntity } from '../../domain/entities/contract.entity.ts'
import type { ImportableContract } from '../../domain/ports/billing-api.port.ts'

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
