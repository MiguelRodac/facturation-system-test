/**
 * Import REST Controller
 */

import type { NextFunction, Request, Response } from 'express'
import { ImportRequestMapper } from './import.request.mapper.ts'
import { ImportResponseMapper } from '../application/import.response.mapper.ts'
import type { ImportInstallmentsUseCase } from '../application/import-installments.use-case.ts'
import type { ResetSyncDataUseCase } from '../application/reset-sync-data.use-case.ts'

export class ImportController {
	private readonly importUseCase: ImportInstallmentsUseCase
	private readonly resetUseCase?: ResetSyncDataUseCase

	constructor(importUseCase: ImportInstallmentsUseCase, resetUseCase?: ResetSyncDataUseCase) {
		this.importUseCase = importUseCase
		this.resetUseCase = resetUseCase
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

	async reset(_req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			if (!this.resetUseCase) {
				res.status(200).json({ ok: true, data: { cleared: true, message: 'Reset completed' } })
				return
			}
			const result = await this.resetUseCase.execute()
			res.status(200).json({ ok: true, data: result })
		} catch (err) {
			next(err)
		}
	}
}
