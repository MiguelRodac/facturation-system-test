/**
 * Use Case: Get Customer Dossier (§3.6)
 */

import type { CustomerDossierEntity, CustomerRepositoryPort } from '../domain/index.ts'

export class GetCustomerDossierUseCase {
	private readonly customerRepository: CustomerRepositoryPort

	constructor(customerRepository: CustomerRepositoryPort) {
		this.customerRepository = customerRepository
	}

	async execute(customerId: string): Promise<CustomerDossierEntity | null> {
		return this.customerRepository.getCustomerDossier(customerId)
	}
}
