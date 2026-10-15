/**
 * Use Case: List Customers (§3.5)
 */

import type { CustomerRepositoryPort, CustomerSummaryEntity } from '../domain/index.ts'

export class ListCustomersUseCase {
	private readonly customerRepository: CustomerRepositoryPort

	constructor(customerRepository: CustomerRepositoryPort) {
		this.customerRepository = customerRepository
	}

	async execute(query?: string): Promise<CustomerSummaryEntity[]> {
		return this.customerRepository.listCustomers(query)
	}
}
