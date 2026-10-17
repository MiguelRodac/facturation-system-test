/**
 * Import REST Controller
 */

import type { NextFunction, Request, Response } from 'express'
import { ImportRequestMapper } from './import.request.mapper.ts'
import { ImportResponseMapper } from '../application/import.response.mapper.ts'
import type { ImportInstallmentsUseCase } from '../application/import-installments.use-case.ts'

export class ImportController {
	private readonly importUseCase: ImportInstallmentsUseCase

	constructor(importUseCase: ImportInstallmentsUseCase) {
		this.importUseCase = importUseCase
	}

	async import(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const query = ImportRequestMapper.toQuery(req.query)
			const result = await this.importUseCase.execute({ isSimulation: query.isSimulation })
			const dto = ImportResponseMapper.toDto(result)
			res.status(200).json({ data: dto })
		} catch (err) {
			next(err)
		}
	}
}
