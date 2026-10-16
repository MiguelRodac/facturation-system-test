/**
 * SQLite Implementation of CustomerRepositoryPort (§3.5 & §3.6)
 * Strictly queries the 'customer' table only
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { CustomerEntity, CustomerRepositoryPort } from '../domain/index.ts'

interface CustomerRow {
	id: string
	name: string
	person_type: 'NATURAL' | 'LEGAL'
	email: string | null
	phone: string | null
	address: string | null
	origin: string
	created_at: string
}

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
		return rows.map(r => ({
			id: r.id,
			name: r.name,
			personType: r.person_type,
			email: r.email,
			phone: r.phone,
			address: r.address,
			origin: r.origin,
			createdAt: r.created_at,
		}))
	}

	async findById(id: string): Promise<CustomerEntity | null> {
		const sql = `
			SELECT id, name, person_type, email, phone, address, origin, created_at
			FROM customer
			WHERE id = ?
		`
		const r = this.db.queryOne<CustomerRow>(sql, [id])
		if (!r) return null
		return {
			id: r.id,
			name: r.name,
			personType: r.person_type,
			email: r.email,
			phone: r.phone,
			address: r.address,
			origin: r.origin,
			createdAt: r.created_at,
		}
	}
}
