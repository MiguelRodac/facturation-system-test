/**
 * Import Routes Dispatcher
 * Routes:
 *   POST /api/v1/sync/import?simulate=true|false
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ImportController } from './import.controller.ts'

export function dispatchImportRoutes(
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	url: URL,
	controller: ImportController
): boolean {
	if (req.method === 'POST' && pathname === '/api/v1/sync/import') {
		const simulate = url.searchParams.get('simulate') === 'true'
		void controller.import(req, res, simulate)
		return true
	}

	return false
}
