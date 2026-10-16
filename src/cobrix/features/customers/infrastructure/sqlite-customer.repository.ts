/**
 * SQLite Implementation of CustomerRepositoryPort (§3.5 & §3.6)
 * Strictly queries the 'customer' table only
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { CustomerEntity, CustomerRepositoryPort } from '../domain/index.ts'
import { CustomerMapper, type CustomerRow } from './customer.mapper.ts'

export class SqliteCustomerRepository implements CustomerRepositoryPort {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async findAll(query?: string): Promise<CustomerEntity[]> {
		const sql = `
			SELECT id, name, person_type, email, phone, address, origin, created_at
			FROM customer
			${query ? 'WHERE (name LIKE ? OR id LIKE ?)' : ''}
			ORDER BY name ASC
		`
		const params = query ? [`%${query}%`, `%${query}%`] : []
		const rows = this.db.query<CustomerRow>(sql, params)
		return rows.map(CustomerMapper.toDomain)
	}

	async findById(id: string): Promise<CustomerEntity | null> {
		const sql = `
			SELECT id, name, person_type, email, phone, address, origin, created_at
			FROM customer
			WHERE id = ?
		`
		const row = this.db.queryOne<CustomerRow>(sql, [id])
		if (!row) return null
		return CustomerMapper.toDomain(row)
	}
}
