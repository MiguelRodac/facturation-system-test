/**
 * Runs Express Router
 * Routes:
 *   GET /api/v1/sync/runs
 *   GET /api/v1/sync/runs/:id
 */

import { Router } from 'express'
import type { RunsController } from './runs.controller.ts'

export function createRunsRouter(controller: RunsController): Router {
	const router = Router()

	router.get('/runs', (req, res, next) => {
		void controller.list(req, res, next)
	})

	router.get('/runs/:id', (req, res, next) => {
		void controller.getById(req, res, next)
	})

	return router
}
