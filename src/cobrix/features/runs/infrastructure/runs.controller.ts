/**
 * Runs REST Controller
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { NotFoundError } from '../../../shared/domain/errors/app.errors.ts'
import { handleRFC9457Error } from '../../../shared/infrastructure/middleware/rfc9457-error-handler.ts'
import { RunsResponseMapper } from '../application/runs.response.mapper.ts'
import type { GetRecentRunsUseCase, GetRunDetailUseCase } from '../application/runs.use-cases.ts'

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

	async list(req: IncomingMessage, res: ServerResponse, limit = 20): Promise<void> {
		try {
			const runs = await this.getRecentRunsUseCase.execute(limit)
			const dtos = runs.map(RunsResponseMapper.toRunDto)
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify({ data: dtos }))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}

	async getById(req: IncomingMessage, res: ServerResponse, runId: number): Promise<void> {
		try {
			const detail = await this.getRunDetailUseCase.execute(runId)
			if (!detail) {
				throw new NotFoundError(`Sync run with ID '${runId}' not found`)
			}
			const dto = RunsResponseMapper.toRunDetailDto(detail)
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify({ data: dto }))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}
}
