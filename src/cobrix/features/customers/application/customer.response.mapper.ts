/**
 * Customer Response Mapper
 * Formats domain entities into JSON DTO responses
 * Matching pattern from myintelli-global-api (entities.response.mapper.ts)
 */

import type { CustomerDossierEntity, CustomerSummaryEntity } from '../domain/customer.entities.ts'

export interface CustomerSummaryDto {
	id: string
	name: string
	person_type: 'NATURAL' | 'LEGAL'
	contracts_count: number
	open_invoices_count: number
	paid_invoices_count: number
	total_debt: number
	oldest_due_date: string | null
}

export interface CustomerDossierDto {
	profile: {
		id: string
		name: string
		person_type: 'NATURAL' | 'LEGAL'
		email: string | null
		phone: string | null
		address: string | null
		origin: string
		created_at: string
	}
	contracts: Array<{
		id: number
		code: string
		status: string
		plan_name: string
		plan_price: number
		branch_name: string | null
	}>
	invoices: Array<{
		id: number
		external_installment_id: string
		contract_id: number
		period: string
		due_date: string
		cutoff_date: string
		total_amount: number
		balance: number
		status: 'OPEN' | 'PAID'
		is_partial_payment: boolean
		paid_at: string | null
		paid_by_invoice_number: string | null
		imported_at: string
	}>
	totals: {
		total_debt: number
		open_count: number
		paid_count: number
		contracts_count: number
	}
	timeline: Array<{
		date: string
		title: string
		description: string
		tone: 'ok' | 'info' | 'warn' | 'mute'
	}>
}

export class CustomerResponseMapper {
	static toSummaryDto(entity: CustomerSummaryEntity): CustomerSummaryDto {
		return {
			id: entity.id,
			name: entity.name,
			person_type: entity.personType,
			contracts_count: entity.contractsCount,
			open_invoices_count: entity.openInvoicesCount,
			paid_invoices_count: entity.paidInvoicesCount,
			total_debt: entity.totalDebt,
			oldest_due_date: entity.oldestDueDate,
		}
	}

	static toDossierDto(entity: CustomerDossierEntity): CustomerDossierDto {
		return {
			profile: {
				id: entity.profile.id,
				name: entity.profile.name,
				person_type: entity.profile.personType,
				email: entity.profile.email ?? null,
				phone: entity.profile.phone ?? null,
				address: entity.profile.address ?? null,
				origin: entity.profile.origin,
				created_at: entity.profile.createdAt,
			},
			contracts: entity.contracts.map(c => ({
				id: c.id,
				code: c.code,
				status: c.status,
				plan_name: c.planName,
				plan_price: c.planPrice,
				branch_name: c.branchName ?? null,
			})),
			invoices: entity.invoices.map(i => ({
				id: i.id,
				external_installment_id: i.externalInstallmentId,
				contract_id: i.contractId,
				period: i.period,
				due_date: i.dueDate,
				cutoff_date: i.cutoffDate,
				total_amount: i.totalAmount,
				balance: i.balance,
				status: i.status,
				is_partial_payment: i.isPartialPayment,
				paid_at: i.paidAt ?? null,
				paid_by_invoice_number: i.paidByInvoiceNumber ?? null,
				imported_at: i.importedAt,
			})),
			totals: {
				total_debt: entity.totals.totalDebt,
				open_count: entity.totals.openCount,
				paid_count: entity.totals.paidCount,
				contracts_count: entity.totals.contractsCount,
			},
			timeline: entity.timeline.map(t => ({
				date: t.date,
				title: t.title,
				description: t.description,
				tone: t.tone,
			})),
		}
	}
}
