/**
 * Zod Validation Helper for Cobrix API
 * Bridges Zod schema validation to RFC 9457 ValidationError
 */

import { z } from 'zod'
import { ValidationError, type RFC9457Issue } from '../../domain/errors/app.errors.ts'

export function validateWithZod<T>(schema: z.ZodType<T>, data: unknown): T {
	const result = schema.safeParse(data)
	if (!result.success) {
		const issues: RFC9457Issue[] = result.error.issues.map(iss => ({
			field: iss.path.join('.') || 'body',
			message: iss.message,
		}))
		throw new ValidationError('Validation failed for request payload', issues)
	}
	return result.data
}
