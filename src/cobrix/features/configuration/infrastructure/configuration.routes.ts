/**
 * Configuration Routes Dispatcher
 * Routes:
 *   GET  /api/v1/config
 *   PUT  /api/v1/config
 *   POST /api/v1/config/test-connection
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ConfigurationController } from './configuration.controller.ts'

export function dispatchConfigurationRoutes(
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	controller: ConfigurationController
): boolean {
	if (pathname === '/api/v1/config') {
		if (req.method === 'GET') {
			void controller.get(req, res)
			return true
		}
		if (req.method === 'PUT') {
			void controller.update(req, res)
			return true
		}
	}

	if (pathname === '/api/v1/config/test-connection' && req.method === 'POST') {
		void controller.testConnection(req, res)
		return true
	}

	return false
}
