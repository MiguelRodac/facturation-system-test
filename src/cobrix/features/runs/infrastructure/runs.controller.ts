/**
 * Runs REST Controller
 */

import type { NextFunction, Request, Response } from 'express'
import { NotFoundError } from '../../../shared/domain/errors/app.errors.ts'
import { RunsResponseMapper } from '../application/runs.response.mapper.ts'
import type { GetRecentRunsUseCase, GetRunDetailUseCase } from '../application/index.ts'

export class RunsController {
	private readonly getRecentRunsUseCase: GetRecentRunsUseCase
	private readonly getRunDetailUseCase: GetRunDetailUseCase

	constructor(
		getRecentRunsUseCase: GetRecentRunsUseCase,
		getRunDetailUseCase: GetRunDetailUseCase
	) {
		this.getRecentRunsUseCase = getRecentRunsUseCase
		this.getRunDetailUseCase = getRunDetailUseCase
	}

	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const limitParam = typeof req.query.limit === 'string' ? req.query.limit : undefined
			const limit = limitParam ? Number(limitParam) : 20
			const runs = await this.getRecentRunsUseCase.execute(limit)
			const dtos = runs.map(RunsResponseMapper.toRunDto)
			res.status(200).json({ data: dtos })
		} catch (err) {
			next(err)
		}
	}

	async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const runId = Number(req.params.id)
			const detail = await this.getRunDetailUseCase.execute(runId)
			if (!detail) {
				throw new NotFoundError(`Sync run with ID '${runId}' not found`)
			}
			const dto = RunsResponseMapper.toRunDetailDto(detail)
			res.status(200).json({ data: dto })
		} catch (err) {
			next(err)
		}
	}
}
