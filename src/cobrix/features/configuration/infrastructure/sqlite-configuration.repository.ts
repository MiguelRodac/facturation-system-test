/**
 * SQLite Configuration Repository (docs/ENUNCIADO.md §3.1)
 *
 * Persists and retrieves configuration from company_config table via DatabaseClient.
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import {
	type ConfigurationEntity,
	DEFAULT_CONFIGURATION,
} from '../domain/configuration.entity.ts'
import type { ConfigurationRepository } from '../domain/configuration.repository.ts'

interface ConfigRow {
	id: number
	company_name: string
	company_tax_id: string
	billing_email: string
	api_url: string
	api_user: string
	api_password: string
	importable_statuses: string
	import_window_months: number | null
	max_recent_installments: number | null
	grace_days: number
	max_new_invoices: number | null
	max_new_amount: number | null
	excluded_doc_types: string
	auto_run_hour: string | null
	auto_run_enabled: number
	updated_at?: string
}

export class SqliteConfigurationRepository implements ConfigurationRepository {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async get(): Promise<ConfigurationEntity> {
		const row = await this.db.queryOne<ConfigRow>(
			`SELECT id, company_name, company_tax_id, billing_email, api_url, api_user, api_password,
			        importable_statuses, import_window_months, max_recent_installments,
			        grace_days, max_new_invoices, max_new_amount, excluded_doc_types,
			        auto_run_hour, auto_run_enabled, updated_at
			 FROM company_config WHERE id = 1`,
		)

		if (!row) {
			return DEFAULT_CONFIGURATION
		}

		let importableStatuses: string[] = [...DEFAULT_CONFIGURATION.importableStatuses]
		try {
			const parsed = JSON.parse(row.importable_statuses)
			if (Array.isArray(parsed)) importableStatuses = parsed
		} catch {
			// fallback to default
		}

		let excludedDocTypes: string[] = [...DEFAULT_CONFIGURATION.excludedDocTypes]
		try {
			const parsed = JSON.parse(row.excluded_doc_types)
			if (Array.isArray(parsed)) excludedDocTypes = parsed
		} catch {
			// fallback to default
		}

		return {
			id: row.id,
			companyName: row.company_name || DEFAULT_CONFIGURATION.companyName,
			companyTaxId: row.company_tax_id || DEFAULT_CONFIGURATION.companyTaxId,
			billingEmail: row.billing_email || DEFAULT_CONFIGURATION.billingEmail,
			apiUrl: row.api_url || DEFAULT_CONFIGURATION.apiUrl,
			apiUser: row.api_user || DEFAULT_CONFIGURATION.apiUser,
			apiPassword: row.api_password || DEFAULT_CONFIGURATION.apiPassword,
			importableStatuses,
			importWindowMonths: row.import_window_months,
			maxRecentInstallments: row.max_recent_installments,
			graceDays: row.grace_days ?? 0,
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

	async update(patch: Partial<ConfigurationEntity>): Promise<ConfigurationEntity> {
		const current = await this.get()
		const merged: ConfigurationEntity = {
			...current,
			...patch,
		}

		await this.db.execute(
			`UPDATE company_config SET
			   company_name = ?,
			   company_tax_id = ?,
			   billing_email = ?,
			   api_url = ?,
			   api_user = ?,
			   api_password = ?,
			   importable_statuses = ?,
			   import_window_months = ?,
			   max_recent_installments = ?,
			   grace_days = ?,
			   max_new_invoices = ?,
			   max_new_amount = ?,
			   excluded_doc_types = ?,
			   auto_run_hour = ?,
			   auto_run_enabled = ?,
			   updated_at = datetime('now')
			 WHERE id = 1`,
			[
				merged.companyName,
				merged.companyTaxId,
				merged.billingEmail,
				merged.apiUrl,
				merged.apiUser,
				merged.apiPassword,
				JSON.stringify(merged.importableStatuses),
				merged.importWindowMonths,
				merged.maxRecentInstallments,
				merged.graceDays,
				merged.maxNewInvoices,
				merged.maxNewAmount,
				JSON.stringify(merged.excludedDocTypes),
				merged.autoRunHour ?? null,
				merged.autoRunEnabled ? 1 : 0,
			],
		)

		return this.get()
	}
}
