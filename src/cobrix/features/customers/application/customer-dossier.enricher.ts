/**
 * Customer Dossier Enrichment Service (Application Service)
 * Orchestrates entity composition, debt aggregation and chronological timeline
 * Eliminates cross-table coupling in repositories (Single-Table Repository principle)
 */

import type { ContractEntity } from '../../contracts/domain/contract.entity.ts'
import type { CustomerInvoiceSummary, InvoiceEntity } from '../../invoices/domain/invoice.entity.ts'
import type {
	CustomerContractEntity,
	CustomerDossierEntity,
	CustomerEntity,
	CustomerInvoiceEntity,
	CustomerSummaryEntity,
	CustomerTimelineEvent,
} from '../domain/customer.entities.ts'
import { CustomerDossierMapper } from './customer-dossier.mapper.ts'

export class CustomerDossierEnricherService {
	enrichDossier(
		customer: CustomerEntity,
		contracts: ContractEntity[],
		invoices: InvoiceEntity[]
	): CustomerDossierEntity {
		const mappedContracts: CustomerContractEntity[] = contracts.map(CustomerDossierMapper.toCustomerContract)
		const mappedInvoices: CustomerInvoiceEntity[] = invoices.map(CustomerDossierMapper.toCustomerInvoice)

		let totalDebt = 0
		let openCount = 0
		let paidCount = 0

		for (const inv of mappedInvoices) {
			if (inv.status === 'OPEN') {
				totalDebt += inv.balance
				openCount++
			} else if (inv.status === 'PAID') {
				paidCount++
			}
		}

		const timeline: CustomerTimelineEvent[] = [
			{
				date: customer.createdAt ?? new Date().toISOString(),
				title: 'Cliente creado en Cobrix',
				description: `Importado con origen ${customer.origin ?? 'ISP'}`,
				tone: 'info',
			},
		]

		for (const inv of mappedInvoices) {
			timeline.push({
				date: inv.importedAt,
				title: `Factura importada (${inv.period})`,
				description: `Monto USD ${inv.totalAmount.toFixed(2)}, vencimiento ${inv.dueDate}`,
				tone: 'mute',
			})

			if (inv.status === 'PAID' && inv.paidAt) {
				timeline.push({
					date: inv.paidAt,
					title: `Factura pagada en el ISP (${inv.period})`,
					description: inv.paidByInvoiceNumber
						? `Cobro acreditado mediante recibo ${inv.paidByInvoiceNumber}`
						: 'Marcada pagada tras conciliación de pagos',
					tone: 'ok',
				})
			}
		}

		timeline.sort((a, b) => b.date.localeCompare(a.date))

		return {
			profile: customer,
			contracts: mappedContracts,
			invoices: mappedInvoices,
			totals: {
				totalDebt: Math.round(totalDebt * 100) / 100,
				openCount,
				paidCount,
				contractsCount: mappedContracts.length,
			},
			timeline,
		}
	}

	enrichSummaries(
		customers: CustomerEntity[],
		contractsCountByCustomerId: Map<string, number>,
		invoiceSummaryByCustomerId: Map<string, CustomerInvoiceSummary>
	): CustomerSummaryEntity[] {
		const summaries: CustomerSummaryEntity[] = customers.map(c => {
			const contractsCount = contractsCountByCustomerId.get(c.id) ?? 0
			const inv = invoiceSummaryByCustomerId.get(c.id)
			return CustomerDossierMapper.toCustomerSummary(c, contractsCount, inv)
		})

		return summaries.sort((a, b) => {
			if (b.totalDebt !== a.totalDebt) {
				return b.totalDebt - a.totalDebt
			}
			return a.name.localeCompare(b.name)
		})
	}
}
