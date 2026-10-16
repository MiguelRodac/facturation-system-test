/**
 * Import REST Controller
 */

import type { NextFunction, Request, Response } from 'express'
import { ImportResponseMapper } from '../application/import.response.mapper.ts'
import type { ImportInstallmentsUseCase } from '../application/import-installments.use-case.ts'

export class ImportController {
	private readonly importUseCase: ImportInstallmentsUseCase

	constructor(importUseCase: ImportInstallmentsUseCase) {
		this.importUseCase = importUseCase
	}

	async import(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const isSimulation = req.query.simulate === 'true'
			const result = await this.importUseCase.execute({ isSimulation })
			const dto = ImportResponseMapper.toDto(result)
			res.status(200).json({ data: dto })
		} catch (err) {
			next(err)
		}
	}
}
