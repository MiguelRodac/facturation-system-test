/**
 * Configuration Request Mapper
 *
 * Maps incoming HTTP JSON body (snake_case) to UpdateConfigurationInput domain type.
 */

import type { UpdateConfigurationInput } from '../domain/configuration.types.ts'

export class ConfigurationRequestMapper {
	static toUpdateInput(body: Record<string, unknown>): UpdateConfigurationInput {
		const input: UpdateConfigurationInput = {}

		if (typeof body.company_name === 'string') input.companyName = body.company_name
		if (typeof body.company_tax_id === 'string') input.companyTaxId = body.company_tax_id
		if (typeof body.billing_email === 'string') input.billingEmail = body.billing_email
		if (typeof body.api_url === 'string') input.apiUrl = body.api_url
		if (typeof body.api_user === 'string') input.apiUser = body.api_user
		if (typeof body.api_password === 'string' && body.api_password.trim() !== '') {
			input.apiPassword = body.api_password
		}

		if (Array.isArray(body.importable_statuses)) {
			input.importableStatuses = body.importable_statuses as string[]
		} else if (typeof body.importable_statuses === 'string') {
			input.importableStatuses = body.importable_statuses.split(',').map(s => s.trim()).filter(Boolean)
		}

		if (body.import_window_months !== undefined) {
			input.importWindowMonths = body.import_window_months === null ? null : Number(body.import_window_months)
		}
		if (body.max_recent_installments !== undefined) {
			input.maxRecentInstallments = body.max_recent_installments === null ? null : Number(body.max_recent_installments)
		}
		if (body.grace_days !== undefined) {
			input.graceDays = Number(body.grace_days)
		}
		if (body.max_new_invoices !== undefined) {
			input.maxNewInvoices = body.max_new_invoices === null ? null : Number(body.max_new_invoices)
		}
		if (body.max_new_amount !== undefined) {
			input.maxNewAmount = body.max_new_amount === null ? null : Number(body.max_new_amount)
		}

		if (Array.isArray(body.excluded_doc_types)) {
			input.excludedDocTypes = body.excluded_doc_types as string[]
		} else if (typeof body.excluded_doc_types === 'string') {
			input.excludedDocTypes = body.excluded_doc_types.split(',').map(s => s.trim()).filter(Boolean)
		}

		if (typeof body.auto_run_hour === 'string') {
			input.autoRunHour = body.auto_run_hour
		}
		if (body.auto_run_enabled !== undefined) {
			input.autoRunEnabled = Boolean(body.auto_run_enabled)
		}

		return input
	}
}
