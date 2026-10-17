/**
 * Dashboard Express Router
 * Routes:
 *   GET /api/v1/dashboard
 */

import { Router } from 'express'
import type { DashboardController } from './dashboard.controller.ts'

export function createDashboardRouter(controller: DashboardController): Router {
	const router = Router()

	router.get('/', (req, res, next) => {
		void controller.getSummary(req, res, next)
	})

	return router
}
