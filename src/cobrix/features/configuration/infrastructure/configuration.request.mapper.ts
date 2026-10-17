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

export const updateConfigurationSchema = z
	.object({
		company_name: z.string().trim().min(1, 'Company name cannot be empty').optional(),
		company_tax_id: z.string().trim().min(1, 'Tax ID cannot be empty').optional(),
		billing_email: z.string().trim().email('Must be a valid email address').optional(),
		api_url: z.string().trim().url('Must be a valid HTTP or HTTPS URL').optional(),
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
	.transform((parsed): UpdateConfigurationInput => {
		const entries = Object.entries(parsed)
			.filter(([key, val]) => val !== undefined && !(key === 'api_password' && typeof val === 'string' && val.trim() === ''))
			.map(([key, val]) => [key.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase()), val])
		return Object.fromEntries(entries) as UpdateConfigurationInput
	})

export type UpdateConfigurationSchemaType = z.infer<typeof updateConfigurationSchema>

export const testConnectionSchema = z.object({
	api_url: z.string().trim().url('Must be a valid HTTP or HTTPS URL').optional(),
	api_user: z.string().trim().min(1).optional(),
	api_password: z.string().optional(),
}).transform((parsed) => ({
	apiUrl: parsed.api_url,
	apiUser: parsed.api_user,
	apiPassword: parsed.api_password,
}))

export type TestConnectionSchemaType = z.infer<typeof testConnectionSchema>

export class ConfigurationRequestMapper {
	static toUpdateInput(body: unknown): UpdateConfigurationInput {
		return validateWithZod(updateConfigurationSchema, body)
	}

	static toTestConnectionInput(body: unknown): { apiUrl?: string; apiUser?: string; apiPassword?: string } {
		return validateWithZod(testConnectionSchema, body)
	}
}
