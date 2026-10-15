/**
 * Repository Port for Customers Feature (§3.5 & §3.6)
 */

import type { CustomerDossierEntity, CustomerSummaryEntity } from './customer.entities.ts'

export interface CustomerRepositoryPort {
	listCustomers(query?: string): Promise<CustomerSummaryEntity[]>
	getCustomerDossier(customerId: string): Promise<CustomerDossierEntity | null>
}
