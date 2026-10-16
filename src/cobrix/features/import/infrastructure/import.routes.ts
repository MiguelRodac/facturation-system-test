/**
 * Import Express Router
 * Routes:
 *   POST /api/v1/sync/import?simulate=true|false
 */

import { Router } from 'express'
import type { ImportController } from './import.controller.ts'

export function createImportRouter(controller: ImportController): Router {
	const router = Router()

	router.post('/import', (req, res, next) => {
		void controller.import(req, res, next)
	})

	return router
}
