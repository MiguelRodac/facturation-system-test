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

export class CustomerDossierEnricherService {
	enrichDossier(
		customer: CustomerEntity,
		contracts: ContractEntity[],
		invoices: InvoiceEntity[]
	): CustomerDossierEntity {
		const mappedContracts: CustomerContractEntity[] = contracts.map(c => ({
			id: c.id,
			code: c.code,
			status: c.status,
			planName: c.planName,
			planPrice: c.planPrice,
			branchName: c.branchName,
		}))

		const mappedInvoices: CustomerInvoiceEntity[] = invoices.map(i => ({
			id: i.id,
			externalInstallmentId: i.externalInstallmentId,
			contractId: i.contractId,
			period: i.period,
			dueDate: i.dueDate,
			cutoffDate: i.cutoffDate,
			totalAmount: i.totalAmount,
			balance: i.balance,
			status: i.status,
			isPartialPayment: i.isPartialPayment,
			paidAt: i.paidAt,
			paidByInvoiceNumber: i.paidByInvoiceNumber,
			importedAt: i.importedAt,
		}))

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
				date: customer.createdAt,
				title: 'Cliente creado en Cobrix',
				description: `Importado con origen ${customer.origin}`,
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

			return {
				id: c.id,
				name: c.name,
				personType: c.personType,
				contractsCount,
				openInvoicesCount: inv ? inv.openCount : 0,
				paidInvoicesCount: inv ? inv.paidCount : 0,
				totalDebt: inv ? inv.totalDebt : 0,
				oldestDueDate: inv ? inv.oldestDueDate : null,
			}
		})

		return summaries.sort((a, b) => {
			if (b.totalDebt !== a.totalDebt) {
				return b.totalDebt - a.totalDebt
			}
			return a.name.localeCompare(b.name)
		})
	}
}
