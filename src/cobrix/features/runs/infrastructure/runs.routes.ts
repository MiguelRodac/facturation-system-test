/**
 * Runs Routes Dispatcher
 * Routes:
 *   GET /api/v1/sync/runs
 *   GET /api/v1/sync/runs/:id
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RunsController } from './runs.controller.ts'

export function dispatchRunsRoutes(
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	url: URL,
	controller: RunsController
): boolean {
	if (req.method === 'GET' && pathname === '/api/v1/sync/runs') {
		const limitParam = url.searchParams.get('limit')
		const limit = limitParam ? Number(limitParam) : 20
		void controller.list(req, res, limit)
		return true
	}

	const singleMatch = pathname.match(/^\/api\/v1\/sync\/runs\/(\d+)$/)
	if (req.method === 'GET' && singleMatch) {
		const runId = Number(singleMatch[1]!)
		void controller.getById(req, res, runId)
		return true
	}

	return false
}
