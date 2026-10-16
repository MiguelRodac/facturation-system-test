/**
 * Customer Dossier Application Mapper
 * Maps cross-module domain entities into customer dossier domain views
 */

import type { ContractEntity } from '../../contracts/domain/contract.entity.ts'
import type { CustomerInvoiceSummary, InvoiceEntity } from '../../invoices/domain/invoice.entity.ts'
import type {
	CustomerContractEntity,
	CustomerEntity,
	CustomerInvoiceEntity,
	CustomerSummaryEntity,
} from '../domain/customer.entities.ts'

export class CustomerDossierMapper {
	static toCustomerContract(contract: ContractEntity): CustomerContractEntity {
		return {
			id: contract.id,
			code: contract.code,
			status: contract.status,
			planName: contract.planName,
			planPrice: contract.planPrice,
			branchName: contract.branchName,
		}
	}

	static toCustomerInvoice(invoice: InvoiceEntity): CustomerInvoiceEntity {
		return {
			id: invoice.id ?? 0,
			externalInstallmentId: invoice.externalInstallmentId,
			contractId: invoice.contractId,
			period: invoice.period,
			dueDate: invoice.dueDate,
			cutoffDate: invoice.cutoffDate,
			totalAmount: invoice.totalAmount,
			balance: invoice.balance,
			status: invoice.status,
			isPartialPayment: Boolean(invoice.isPartialPayment),
			paidAt: invoice.paidAt,
			paidByInvoiceNumber: invoice.paidByInvoiceNumber,
			importedAt: invoice.importedAt,
		}
	}

	static toCustomerSummary(
		customer: CustomerEntity,
		contractsCount: number,
		invoiceSummary?: CustomerInvoiceSummary,
	): CustomerSummaryEntity {
		return {
			id: customer.id,
			name: customer.name,
			personType: customer.personType,
			contractsCount,
			openInvoicesCount: invoiceSummary ? invoiceSummary.openCount : 0,
			paidInvoicesCount: invoiceSummary ? invoiceSummary.paidCount : 0,
			totalDebt: invoiceSummary ? invoiceSummary.totalDebt : 0,
			oldestDueDate: invoiceSummary ? invoiceSummary.oldestDueDate : null,
		}
	}
}
