/**
 * Contract Factory
 * Encapsulates instantiation and data normalization of ContractEntity
 */

import type { ContractEntity } from './contract.entity.ts'

export interface CreateContractParams {
	readonly contractId: number
	readonly code: string
	readonly status: string
	readonly planName: string
	readonly planPrice: number
	readonly branchName?: string | null
}

export class ContractFactory {
	static createFromExternal(
		data: CreateContractParams,
		customerId: string,
		createdAt?: string,
	): ContractEntity {
		return {
			id: data.contractId,
			code: data.code,
			customerId,
			status: data.status,
			planName: data.planName,
			planPrice: data.planPrice,
			branchName: data.branchName ?? null,
			createdAt,
		}
	}

	static createFromContract = ContractFactory.createFromExternal
}
