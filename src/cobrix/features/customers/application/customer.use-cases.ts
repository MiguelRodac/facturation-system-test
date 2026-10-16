/**
 * Consolidated Customer Use Cases
 * Matching pattern from myintelli-global-api (entity.use-cases.ts)
 */

import type { ContractRepositoryPort } from '../../contracts/domain/contract.repository.ts'
import type { InvoiceRepositoryPort } from '../../invoices/domain/invoice.repository.ts'
import type { CustomerDossierEntity, CustomerSummaryEntity } from '../domain/customer.entities.ts'
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
