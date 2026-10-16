/**
 * Customer Persistence Mapper
 * Maps between SQLite CustomerRow and CustomerEntity domain model
 */

import type { CustomerEntity } from '../domain/customer.entities.ts'

export interface CustomerRow {
	id: string
	name: string
	person_type: 'NATURAL' | 'LEGAL'
	email: string | null
	phone: string | null
	address: string | null
	origin: string
	created_at: string
}

export class CustomerMapper {
	static toDomain(row: CustomerRow): CustomerEntity {
		return {
			id: row.id,
			name: row.name,
			personType: row.person_type,
			email: row.email,
			phone: row.phone,
			address: row.address,
			origin: row.origin,
			createdAt: row.created_at,
		}
	}

	static toPersistence(entity: CustomerEntity): CustomerRow {
		return {
			id: entity.id,
			name: entity.name,
			person_type: entity.personType,
			email: entity.email ?? null,
			phone: entity.phone ?? null,
			address: entity.address ?? null,
			origin: entity.origin ?? 'ISP',
			created_at: entity.createdAt ?? new Date().toISOString(),
		}
	}
}
