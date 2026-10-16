/**
 * Import REST Controller
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRFC9457Error } from '../../../shared/infrastructure/middleware/rfc9457-error-handler.ts'
import { ImportResponseMapper } from '../application/import.response.mapper.ts'
import type { ImportInstallmentsUseCase } from '../application/import.use-cases.ts'

export class ImportController {
	private readonly importUseCase: ImportInstallmentsUseCase

	constructor(importUseCase: ImportInstallmentsUseCase) {
		this.importUseCase = importUseCase
	}

	async import(req: IncomingMessage, res: ServerResponse, isSimulation = false): Promise<void> {
		try {
			const result = await this.importUseCase.execute({ isSimulation })
			const dto = ImportResponseMapper.toDto(result)
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify({ data: dto }))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}
}
