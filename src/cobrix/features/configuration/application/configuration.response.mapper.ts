/**
 * Configuration Response Mapper
 * Formats ConfigurationEntity into safe API response DTOs
 */

import type { ConfigurationEntity } from '../domain/configuration.entity.ts'

export interface ConfigurationDto {
	id: number
	company_name: string
	company_tax_id: string
	billing_email: string
	api_url: string
	api_user: string
	importable_statuses: string[]
	import_window_months: number | null
	max_recent_installments: number | null
	grace_days: number
	max_new_invoices: number | null
	max_new_amount: number | null
	excluded_doc_types: string[]
	auto_run_hour: string | null
	auto_run_enabled: boolean
	updated_at: string
}

export class ConfigurationResponseMapper {
	static toDto(entity: ConfigurationEntity): ConfigurationDto {
		return {
			id: entity.id,
			company_name: entity.companyName,
			company_tax_id: entity.companyTaxId,
			billing_email: entity.billingEmail,
			api_url: entity.apiUrl,
			api_user: entity.apiUser,
			importable_statuses: [...entity.importableStatuses],
			import_window_months: entity.importWindowMonths ?? null,
			max_recent_installments: entity.maxRecentInstallments ?? null,
			grace_days: entity.graceDays,
			max_new_invoices: entity.maxNewInvoices ?? null,
			max_new_amount: entity.maxNewAmount ?? null,
			excluded_doc_types: [...entity.excludedDocTypes],
			auto_run_hour: entity.autoRunHour ?? null,
			auto_run_enabled: Boolean(entity.autoRunEnabled),
			updated_at: entity.updatedAt ?? new Date().toISOString(),
		}
	}
}
