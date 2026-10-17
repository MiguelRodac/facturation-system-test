/**
 * Import Request Mapper & Zod Schemas
 */

import { z } from 'zod'
import { validateWithZod } from '../../../shared/infrastructure/validation/zod-validator.ts'

export const importQuerySchema = z.object({
	simulate: z
		.union([z.boolean(), z.enum(['true', 'false', '1', '0', ''])])
		.optional()
		.transform(v => v === true || v === 'true' || v === '1'),
})

export class ImportRequestMapper {
	static toQuery(query: unknown): { isSimulation: boolean } {
		const parsed = validateWithZod(importQuerySchema, query)
		return { isSimulation: parsed.simulate ?? false }
	}
}
