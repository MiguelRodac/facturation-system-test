/**
 * Invoice Repository Port
 * Single-table invoice operations only
 */

import type { CustomerInvoiceSummary, InvoiceEntity } from './invoice.entity.ts'

export interface InvoiceRepositoryPort {
	findByCustomerId(customerId: string): Promise<InvoiceEntity[]>
	findSummaries(): Promise<Map<string, CustomerInvoiceSummary>>
	getSummaryByCustomerId(customerId: string): Promise<CustomerInvoiceSummary | null>
	findOpenInvoices(): Promise<InvoiceEntity[]>
}
