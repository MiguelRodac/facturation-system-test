/**
 * Configuration Express Routes (docs/ENUNCIADO.md §3.1)
 *
 * Defines REST endpoints for company configuration and ISP connection test.
 */

import { Router } from 'express'
import type { ConfigurationController } from './configuration.controller.ts'

export function createConfigurationRouter(controller: ConfigurationController): Router {
	const router = Router()

	router.get('/', controller.get)
	router.put('/', controller.update)
	router.post('/test-connection', controller.testConnection)

	return router
}
