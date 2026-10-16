/**
 * Customer Repository Port (§3.5 & §3.6)
 * Single-table operations strictly on 'customer' table
 */

import type { CustomerEntity } from './customer.entities.ts'

export interface CustomerRepositoryPort {
	findAll(query?: string): Promise<CustomerEntity[]>
	findById(id: string): Promise<CustomerEntity | null>
}
