/**
 * Runs Request Mapper & Zod Schemas
 */

import { z } from 'zod'
import { validateWithZod } from '../../../shared/infrastructure/validation/zod-validator.ts'

export const listRunsQuerySchema = z.object({
	limit: z.union([z.number().int().min(1).max(100), z.string().transform(Number)]).optional(),
})

export const runParamsSchema = z.object({
	id: z.union([z.number().int().positive(), z.string().transform(Number)]),
})

export class RunsRequestMapper {
	static toListQuery(query: unknown): { limit: number } {
		const parsed = validateWithZod(listRunsQuerySchema, query)
		return { limit: parsed.limit ?? 20 }
	}

	static toParams(params: unknown): { id: number } {
		const parsed = validateWithZod(runParamsSchema, params)
		return { id: parsed.id }
	}
}
