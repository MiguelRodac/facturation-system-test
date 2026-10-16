/**
 * Customer Express Router
 * Routes:
 *   GET /api/v1/customers?q=
 *   GET /api/v1/customers/:id
 */

import { Router } from 'express'
import type { CustomerController } from './customer.controller.ts'

export function createCustomerRouter(controller: CustomerController): Router {
	const router = Router()

	router.get('/', (req, res, next) => {
		void controller.list(req, res, next)
	})

	router.get('/:id', (req, res, next) => {
		void controller.getById(req, res, next)
	})

	return router
}
