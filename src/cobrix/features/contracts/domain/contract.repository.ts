/**
 * Contract Repository Port
 * Single-table contract operations only
 */

import type { ContractEntity } from './contract.entity.ts'

export interface ContractRepositoryPort {
	findByCustomerId(customerId: string): Promise<ContractEntity[]>
	countByCustomerId(customerId: string): Promise<number>
	findById(id: number): Promise<ContractEntity | null>
}
