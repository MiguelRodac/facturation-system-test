/**
 * SQLite Implementation of ContractRepositoryPort
 * Strictly queries the 'contract' table only
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { ContractEntity, ContractRepositoryPort } from '../domain/index.ts'

interface ContractRow {
	id: number
	code: string
	customer_id: string
	status: string
	plan_name: string
	plan_price: number
	branch_name: string | null
	created_at?: string
}

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
		return rows.map(r => ({
			id: r.id,
			code: r.code,
			customerId: r.customer_id,
			status: r.status,
			planName: r.plan_name,
			planPrice: Number(r.plan_price),
			branchName: r.branch_name,
			createdAt: r.created_at,
		}))
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
		const r = this.db.queryOne<ContractRow>(sql, [id])
		if (!r) return null
		return {
			id: r.id,
			code: r.code,
			customerId: r.customer_id,
			status: r.status,
			planName: r.plan_name,
			planPrice: Number(r.plan_price),
			branchName: r.branch_name,
			createdAt: r.created_at,
		}
	}
}
