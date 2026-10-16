/**
 * List Customers Use Case (docs/ENUNCIADO.md §3.5 & §3.6)
 * Single Responsibility: Query customer summaries enriched with contract & debt stats
 */

import type { ContractRepositoryPort } from '../../contracts/domain/contract.repository.ts'
import type { InvoiceRepositoryPort } from '../../invoices/domain/invoice.repository.ts'
import type { CustomerSummaryEntity } from '../domain/customer.entities.ts'
import type { CustomerRepositoryPort } from '../domain/customer.repository.ts'
import { CustomerDossierEnricherService } from './customer-dossier.enricher.ts'

export class ListCustomersUseCase {
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

	async execute(query?: string): Promise<CustomerSummaryEntity[]> {
		const customers = await this.customerRepo.findAll(query)
		if (customers.length === 0) return []

		const invoiceSummaries = await this.invoiceRepo.findSummaries()

		const contractCounts = new Map<string, number>()
		for (const customer of customers) {
			const count = await this.contractRepo.countByCustomerId(customer.id)
			contractCounts.set(customer.id, count)
		}

		return this.enricher.enrichSummaries(customers, contractCounts, invoiceSummaries)
	}
}
