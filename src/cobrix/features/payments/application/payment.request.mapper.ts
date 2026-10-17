/**
 * Payment Request Mapper & Zod Schemas
 */

import { z } from 'zod'
import { validateWithZod } from '../../../shared/infrastructure/validation/zod-validator.ts'

export const reconcileQuerySchema = z.object({
	simulate: z
		.union([z.boolean(), z.enum(['true', 'false', '1', '0', ''])])
		.optional()
		.transform(v => v === true || v === 'true' || v === '1'),
})

export class PaymentRequestMapper {
	static toQuery(query: unknown): { isSimulation: boolean } {
		const parsed = validateWithZod(reconcileQuerySchema, query)
		return { isSimulation: parsed.simulate ?? false }
	}
}
