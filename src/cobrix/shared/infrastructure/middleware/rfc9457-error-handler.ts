/**
 * RFC 9457 Problem Details Middleware
 * Formats errors as application/problem+json with trace ID
 * Matching pattern from api-interesting-facts
 */

import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { NextFunction, Request, Response } from 'express'
import { AppError, type RFC9457ProblemDetails } from '../../domain/errors/app.errors.ts'

export const PROBLEM_CONTENT_TYPE = 'application/problem+json'

export function handleRFC9457Error(
	err: unknown,
	req: IncomingMessage,
	res: ServerResponse
): void {
	const traceId = (req.headers['x-trace-id'] as string) || randomUUID()
	const instance = req.url || '/'

	res.setHeader('Content-Type', PROBLEM_CONTENT_TYPE)
	res.setHeader('X-Trace-Id', traceId)

	if (err instanceof AppError) {
		const payload = err.toRFC9457(instance, traceId)
		res.writeHead(err.status)
		res.end(JSON.stringify(payload, null, 2))
		return
	}

	const error = err instanceof Error ? err : new Error(String(err))
	const payload: RFC9457ProblemDetails = {
		type: 'https://cobrix.com/errors/internal-server-error',
		title: 'Internal Server Error',
		status: 500,
		detail: error.message || 'An unexpected error occurred',
		instance,
		trace_id: traceId,
		timestamp: new Date().toISOString(),
	}

	res.writeHead(500)
	res.end(JSON.stringify(payload, null, 2))
}

export function rfc9457ErrorMiddleware(
	err: unknown,
	req: Request,
	res: Response,
	_next: NextFunction
): void {
	handleRFC9457Error(err, req, res)
}
