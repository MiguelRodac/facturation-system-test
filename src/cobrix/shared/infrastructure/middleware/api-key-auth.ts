/**
 * API Key / Bearer Token Authentication Middleware
 * Enforces RFC 9457 Problem Details on authentication failures
 */

import type { NextFunction, Request, Response } from 'express'
import { UnauthorizedError } from '../../domain/errors/app.errors.ts'

export interface ApiKeyAuthOptions {
	apiKey?: string
	exemptPaths?: string[]
}

export function createApiKeyAuthMiddleware(options: ApiKeyAuthOptions = {}) {
	const configuredKey = options.apiKey ?? process.env.COBRIX_API_KEY
	const exemptPaths = options.exemptPaths ?? ['/api/v1/openapi.json', '/docs']

	return (req: Request, _res: Response, next: NextFunction): void => {
		// If no key is configured, pass through (e.g. in environments where auth is disabled)
		if (!configuredKey) {
			return next()
		}

		// Exempt public endpoints
		const path = req.path || req.originalUrl || ''
		const original = req.originalUrl || ''
		if (exemptPaths.some(p => path.startsWith(p) || original.startsWith(p))) {
			return next()
		}

		// Check Authorization: Bearer <key> or X-API-Key: <key>
		const authHeader = req.headers['authorization']
		const xApiKey = req.headers['x-api-key']

		let providedToken: string | undefined
		if (typeof authHeader === 'string') {
			if (authHeader.startsWith('Bearer ')) {
				providedToken = authHeader.slice(7).trim()
			} else {
				providedToken = authHeader.trim()
			}
		} else if (typeof xApiKey === 'string') {
			providedToken = xApiKey.trim()
		}

		if (!providedToken) {
			return next(new UnauthorizedError('Missing authentication token. Provide Authorization: Bearer <token> or X-API-Key header.'))
		}

		if (providedToken !== configuredKey) {
			return next(new UnauthorizedError('Invalid authentication token.'))
		}

		next()
	}
}
