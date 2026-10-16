/**
 * SQLite Implementation of ContractRepositoryPort
 * Strictly queries the 'contract' table only
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { ContractEntity, ContractRepositoryPort } from '../domain/index.ts'
import { ContractMapper, type ContractRow } from './contract.mapper.ts'

export class SqliteContractRepository implements ContractRepositoryPort {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async findByCustomerId(customerId: string): Promise<ContractEntity[]> {
		const sql = `
			SELECT id, code, customer_id, status, plan_name, plan_price, branch_name, created_at
			FROM contract
			WHERE customer_id = ?
			ORDER BY id ASC
		`
		const rows = this.db.query<ContractRow>(sql, [customerId])
		return rows.map(ContractMapper.toDomain)
	}

	async countByCustomerId(customerId: string): Promise<number> {
		const sql = `SELECT COUNT(*) AS total FROM contract WHERE customer_id = ?`
		const row = this.db.queryOne<{ total: number }>(sql, [customerId])
		return row ? Number(row.total) : 0
	}

	async findById(id: number): Promise<ContractEntity | null> {
		const sql = `
			SELECT id, code, customer_id, status, plan_name, plan_price, branch_name, created_at
			FROM contract
			WHERE id = ?
		`
		const row = this.db.queryOne<ContractRow>(sql, [id])
		if (!row) return null
		return ContractMapper.toDomain(row)
	}
}
