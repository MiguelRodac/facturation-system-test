/**
 * Customer Routes Dispatcher
 * Routes:
 *   GET /api/v1/customers?q=
 *   GET /api/v1/customers/:id
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { CustomerController } from './customer.controller.ts'

export function dispatchCustomerRoutes(
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	url: URL,
	controller: CustomerController
): boolean {
	if (req.method === 'GET' && pathname === '/api/v1/customers') {
		const q = url.searchParams.get('q') ?? undefined
		void controller.list(req, res, q)
		return true
	}

	const singleMatch = pathname.match(/^\/api\/v1\/customers\/([^/]+)$/)
	if (req.method === 'GET' && singleMatch) {
		const customerId = decodeURIComponent(singleMatch[1]!)
		void controller.getById(req, res, customerId)
		return true
	}

	return false
}
