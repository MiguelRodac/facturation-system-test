/**
 * Configuration Persistence Mapper
 *
 * Maps raw database rows from company_config table to ConfigurationEntity domain models.
 */

import { Identification } from '../../../shared/domain/identification.vo.ts'
import type { ConfigurationEntity } from '../domain/configuration.entity.ts'

export interface ConfigRow {
	readonly id: number
	readonly company_name: string
	readonly company_tax_id: string
	readonly billing_email: string
	readonly api_url: string
	readonly api_user: string
	readonly api_password: string
	readonly importable_statuses: string
	readonly import_window_months: number | null
	readonly max_recent_installments: number | null
	readonly grace_days: number
	readonly max_new_invoices: number | null
	readonly max_new_amount: number | null
	readonly excluded_doc_types: string
	readonly auto_run_hour: string | null
	readonly auto_run_enabled: number
	readonly updated_at?: string
}

export class ConfigurationMapper {
	static toDomain(row: ConfigRow): ConfigurationEntity {
		let importableStatuses: string[] = ['ACTIVO', 'CORTADO']
		if (row.importable_statuses) {
			try {
				const parsed = JSON.parse(row.importable_statuses)
				if (Array.isArray(parsed)) importableStatuses = parsed
			} catch (err) {
				console.error('[ConfigurationMapper] Failed to parse importable_statuses JSON, using raw string split:', err)
				importableStatuses = row.importable_statuses.split(',').map(s => s.trim()).filter(Boolean)
			}
		}

		let excludedDocTypes: string[] = []
		if (row.excluded_doc_types) {
			try {
				const parsed = JSON.parse(row.excluded_doc_types)
				if (Array.isArray(parsed)) excludedDocTypes = parsed
			} catch (err) {
				console.error('[ConfigurationMapper] Failed to parse excluded_doc_types JSON, using raw string split:', err)
				excludedDocTypes = row.excluded_doc_types.split(',').map(s => s.trim()).filter(Boolean)
			}
		}

		return {
			id: row.id,
			companyName: row.company_name,
			companyTaxId: Identification.parse(row.company_tax_id)?.value ?? row.company_tax_id,
			billingEmail: row.billing_email,
			apiUrl: row.api_url,
			apiUser: row.api_user,
			apiPassword: row.api_password,
			importableStatuses,
			importWindowMonths: row.import_window_months,
			maxRecentInstallments: row.max_recent_installments,
			graceDays: row.grace_days,
			maxNewInvoices: row.max_new_invoices,
			maxNewAmount: row.max_new_amount,
			excludedDocTypes,
			currencyMinRatio: 0.01,
			residualThresholdCents: 1,
			autoRunHour: row.auto_run_hour,
			autoRunEnabled: Boolean(row.auto_run_enabled),
			updatedAt: row.updated_at,
		}
	}
}
