/**
 * Payment Routes Dispatcher
 * Routes:
 *   POST /api/v1/sync/reconcile?simulate=true|false
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PaymentController } from './payment.controller.ts'

export function dispatchPaymentRoutes(
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	url: URL,
	controller: PaymentController
): boolean {
	if (req.method === 'POST' && pathname === '/api/v1/sync/reconcile') {
		const simulate = url.searchParams.get('simulate') === 'true'
		void controller.reconcile(req, res, simulate)
		return true
	}

	return false
}
