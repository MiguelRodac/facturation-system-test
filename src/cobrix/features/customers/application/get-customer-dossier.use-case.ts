/**
 * Get Customer Dossier Use Case (docs/ENUNCIADO.md §3.5 & §3.6)
 * Single Responsibility: Query full customer profile, contracts, invoices and timeline
 */

import type { ContractRepositoryPort } from '../../contracts/domain/contract.repository.ts'
import type { InvoiceRepositoryPort } from '../../invoices/domain/invoice.repository.ts'
import type { CustomerDossierEntity } from '../domain/customer.entities.ts'
import type { CustomerRepositoryPort } from '../domain/customer.repository.ts'
import { CustomerDossierEnricherService } from './customer-dossier.enricher.ts'

export class GetCustomerDossierUseCase {
	private readonly customerRepo: CustomerRepositoryPort
	private readonly contractRepo: ContractRepositoryPort
	private readonly invoiceRepo: InvoiceRepositoryPort
	private readonly enricher: CustomerDossierEnricherService

	constructor(
		customerRepo: CustomerRepositoryPort,
		contractRepo: ContractRepositoryPort,
		invoiceRepo: InvoiceRepositoryPort,
		enricher: CustomerDossierEnricherService = new CustomerDossierEnricherService()
	) {
		this.customerRepo = customerRepo
		this.contractRepo = contractRepo
		this.invoiceRepo = invoiceRepo
		this.enricher = enricher
	}

	async execute(customerId: string): Promise<CustomerDossierEntity | null> {
		const customer = await this.customerRepo.findById(customerId)
		if (!customer) {
			return null
		}

		const contracts = await this.contractRepo.findByCustomerId(customerId)
		const invoices = await this.invoiceRepo.findByCustomerId(customerId)

		return this.enricher.enrichDossier(customer, contracts, invoices)
	}
}
