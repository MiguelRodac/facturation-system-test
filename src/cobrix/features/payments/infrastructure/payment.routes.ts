/**
 * Payment Express Router
 * Routes:
 *   POST /api/v1/sync/reconcile?simulate=true|false
 */

import { Router } from 'express'
import type { PaymentController } from './payment.controller.ts'

export function createPaymentRouter(controller: PaymentController): Router {
	const router = Router()

	router.post('/reconcile', (req, res, next) => {
		void controller.reconcile(req, res, next)
	})

	return router
}
