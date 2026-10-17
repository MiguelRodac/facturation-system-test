/**
 * Customer Request Mapper & Zod Schemas
 */

import { z } from 'zod'
import { validateWithZod } from '../../../shared/infrastructure/validation/zod-validator.ts'

export const listCustomersQuerySchema = z.object({
	q: z.string().trim().optional(),
})

export const customerParamsSchema = z.object({
	id: z.string().trim().min(1, 'Customer identification cannot be empty'),
})

export class CustomerRequestMapper {
	static toListQuery(query: unknown): { q?: string } {
		return validateWithZod(listCustomersQuerySchema, query)
	}

	static toParams(params: unknown): { id: string } {
		return validateWithZod(customerParamsSchema, params)
	}
}
