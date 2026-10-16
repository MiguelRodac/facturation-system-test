/**
 * Import Response Mapper
 * Formats ImportSummary into JSON DTO responses
 */

import type { ImportSummary } from '../domain/import.types.ts'

export interface ImportSummaryDto {
	is_simulation: boolean
	total_contracts_checked: number
	total_installments_checked: number
	imported_customers_count: number
	imported_invoices_count: number
	imported_amount: number
	items_count: number
}

export class ImportResponseMapper {
	static toDto(summary: ImportSummary): ImportSummaryDto {
		return {
			is_simulation: summary.isSimulation,
			total_contracts_checked: summary.totalContractsChecked,
			total_installments_checked: summary.totalInstallmentsChecked,
			imported_customers_count: summary.importedCustomersCount,
			imported_invoices_count: summary.importedInvoicesCount,
			imported_amount: summary.importedAmount,
			items_count: summary.items.length,
		}
	}
}
