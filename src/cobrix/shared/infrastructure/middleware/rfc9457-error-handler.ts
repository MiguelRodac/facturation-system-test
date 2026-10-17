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
	const instance = (req as Request).originalUrl || req.url || '/'

	res.setHeader('Content-Type', PROBLEM_CONTENT_TYPE)
	res.setHeader('X-Trace-Id', traceId)

	if (err instanceof AppError) {
		const payload = err.toRFC9457(instance, traceId)
		res.writeHead(err.status)
		res.end(JSON.stringify(payload, null, 2))
		return
	}

	const error = err instanceof Error ? err : new Error(String(err))
	const errorStatus = (err as { status?: number; statusCode?: number }).status ??
		(err as { status?: number; statusCode?: number }).statusCode

	// Handle malformed JSON body-parser errors (SyntaxError with 400 status)
	if (
		(err instanceof SyntaxError && 'body' in err) ||
		errorStatus === 400 ||
		(err as { type?: string }).type === 'entity.parse.failed'
	) {
		const payload: RFC9457ProblemDetails = {
			type: 'https://cobrix.com/errors/bad-request',
			title: 'Bad Request',
			status: 400,
			detail: `Malformed JSON payload: ${error.message}`,
			instance,
			trace_id: traceId,
			timestamp: new Date().toISOString(),
		}
		res.writeHead(400)
		res.end(JSON.stringify(payload, null, 2))
		return
	}

	// Handle client errors (400-499)
	if (typeof errorStatus === 'number' && errorStatus >= 400 && errorStatus < 500) {
		const payload: RFC9457ProblemDetails = {
			type: `https://cobrix.com/errors/client-error`,
			title: 'Client Error',
			status: errorStatus,
			detail: error.message || 'Client request could not be processed',
			instance,
			trace_id: traceId,
			timestamp: new Date().toISOString(),
		}
		res.writeHead(errorStatus)
		res.end(JSON.stringify(payload, null, 2))
		return
	}

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
