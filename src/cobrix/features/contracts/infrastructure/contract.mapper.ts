/**
 * Contract Persistence Mapper
 * Maps between SQLite ContractRow and ContractEntity domain model
 */

import type { ContractEntity } from '../domain/contract.entity.ts'

export interface ContractRow {
	id: number
	code: string
	customer_id: string
	status: string
	plan_name: string
	plan_price: number
	branch_name: string | null
	created_at?: string
}

export class ContractMapper {
	static toDomain(row: ContractRow): ContractEntity {
		return {
			id: row.id,
			code: row.code,
			customerId: row.customer_id,
			status: row.status,
			planName: row.plan_name,
			planPrice: Number(row.plan_price),
			branchName: row.branch_name,
			createdAt: row.created_at,
		}
	}

	static toPersistence(entity: ContractEntity): ContractRow {
		return {
			id: entity.id,
			code: entity.code,
			customer_id: entity.customerId,
			status: entity.status,
			plan_name: entity.planName,
			plan_price: entity.planPrice,
			branch_name: entity.branchName,
			created_at: entity.createdAt,
		}
	}
}
