/**
 * SQLite Configuration Repository (docs/ENUNCIADO.md §3.1)
 *
 * Persists and retrieves configuration from company_config table via DatabaseClient.
 */

import { NotFoundError } from '../../../shared/domain/errors/app.errors.ts'
import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { ConfigurationEntity } from '../domain/configuration.entity.ts'
import type { ConfigurationRepository } from '../domain/configuration.repository.ts'
import { ConfigurationMapper, type ConfigRow } from './configuration.mapper.ts'

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
			throw new NotFoundError('Company configuration row not found in database')
		}

		return ConfigurationMapper.toDomain(row)
	}

	async update(patch: Partial<ConfigurationEntity>): Promise<ConfigurationEntity> {
		const current = await this.get()
		const updated: ConfigurationEntity = {
			...current,
			...patch,
		}

		const sql = `
			UPDATE company_config
			SET company_name = ?,
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
			WHERE id = 1
		`

		const params = [
			updated.companyName,
			updated.companyTaxId,
			updated.billingEmail,
			updated.apiUrl,
			updated.apiUser,
			updated.apiPassword,
			JSON.stringify(updated.importableStatuses),
			updated.importWindowMonths,
			updated.maxRecentInstallments,
			updated.graceDays,
			updated.maxNewInvoices,
			updated.maxNewAmount,
			JSON.stringify(updated.excludedDocTypes),
			updated.autoRunHour ?? '03:00',
			updated.autoRunEnabled ? 1 : 0,
		]

		await this.db.execute(sql, params)
		return this.get()
	}
}
