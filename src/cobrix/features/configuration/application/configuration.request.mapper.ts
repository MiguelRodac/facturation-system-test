/**
 * Configuration Request Mapper & Zod Schemas
 *
 * Validates and maps incoming HTTP JSON payloads to application inputs using Zod.
 */

import { z } from 'zod'
import { validateWithZod } from '../../../shared/infrastructure/validation/zod-validator.ts'
import type { UpdateConfigurationInput } from '../domain/configuration.types.ts'

const stringArraySchema = z.union([
	z.array(z.string().trim()),
	z.string().transform(str => str.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)),
])

export const updateConfigurationSchema = z.object({
	company_name: z.string().trim().min(1, 'Company name cannot be empty').optional(),
	company_tax_id: z.string().trim().min(1, 'Tax ID cannot be empty').optional(),
	billing_email: z.string().trim().optional(),
	api_url: z.string().trim().min(1, 'API URL cannot be empty').optional(),
	api_user: z.string().trim().min(1, 'API user cannot be empty').optional(),
	api_password: z.string().optional(),
	importable_statuses: stringArraySchema.optional(),
	import_window_months: z.union([z.number().int().min(1), z.string().transform(Number), z.null()]).optional(),
	max_recent_installments: z.union([z.number().int().min(1), z.string().transform(Number), z.null()]).optional(),
	grace_days: z.union([z.number().int().min(0), z.string().transform(Number)]).optional(),
	max_new_invoices: z.union([z.number().int().min(1), z.string().transform(Number), z.null()]).optional(),
	max_new_amount: z.union([z.number().min(0), z.string().transform(Number), z.null()]).optional(),
	excluded_doc_types: stringArraySchema.optional(),
	auto_run_hour: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be in HH:MM format').nullable().optional(),
	auto_run_enabled: z.union([z.boolean(), z.string().transform(v => v === 'true' || v === '1')]).optional(),
})

export type UpdateConfigurationSchemaType = z.infer<typeof updateConfigurationSchema>

export const testConnectionSchema = z.object({
	api_url: z.string().trim().min(1).optional(),
	api_user: z.string().trim().min(1).optional(),
	api_password: z.string().optional(),
})

export type TestConnectionSchemaType = z.infer<typeof testConnectionSchema>

export class ConfigurationRequestMapper {
	static toUpdateInput(body: unknown): UpdateConfigurationInput {
		const parsed = validateWithZod(updateConfigurationSchema, body)
		const input: UpdateConfigurationInput = {}

		if (parsed.company_name !== undefined) input.companyName = parsed.company_name
		if (parsed.company_tax_id !== undefined) input.companyTaxId = parsed.company_tax_id
		if (parsed.billing_email !== undefined) input.billingEmail = parsed.billing_email
		if (parsed.api_url !== undefined) input.apiUrl = parsed.api_url
		if (parsed.api_user !== undefined) input.apiUser = parsed.api_user
		if (parsed.api_password !== undefined && parsed.api_password.trim() !== '') {
			input.apiPassword = parsed.api_password
		}

		if (parsed.importable_statuses !== undefined) {
			input.importableStatuses = parsed.importable_statuses
		}
		if (parsed.import_window_months !== undefined) {
			input.importWindowMonths = parsed.import_window_months
		}
		if (parsed.max_recent_installments !== undefined) {
			input.maxRecentInstallments = parsed.max_recent_installments
		}
		if (parsed.grace_days !== undefined) {
			input.graceDays = parsed.grace_days
		}
		if (parsed.max_new_invoices !== undefined) {
			input.maxNewInvoices = parsed.max_new_invoices
		}
		if (parsed.max_new_amount !== undefined) {
			input.maxNewAmount = parsed.max_new_amount
		}
		if (parsed.excluded_doc_types !== undefined) {
			input.excludedDocTypes = parsed.excluded_doc_types
		}
		if (parsed.auto_run_hour !== undefined) {
			input.autoRunHour = parsed.auto_run_hour
		}
		if (parsed.auto_run_enabled !== undefined) {
			input.autoRunEnabled = parsed.auto_run_enabled
		}

		return input
	}

	static toTestConnectionInput(body: unknown): { apiUrl?: string; apiUser?: string; apiPassword?: string } {
		const parsed = validateWithZod(testConnectionSchema, body)
		return {
			apiUrl: parsed.api_url,
			apiUser: parsed.api_user,
			apiPassword: parsed.api_password,
		}
	}
}
