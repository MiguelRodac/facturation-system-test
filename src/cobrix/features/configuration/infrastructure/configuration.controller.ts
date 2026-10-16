/**
 * Configuration Express Controller
 *
 * Handles HTTP requests for configuration reading, updating, and connection testing.
 */

import type { NextFunction, Request, Response } from 'express'
import { ConfigurationRequestMapper } from '../application/configuration.request.mapper.ts'
import { ConfigurationResponseMapper } from '../application/configuration.response.mapper.ts'
import type { GetConfigurationUseCase } from '../application/get-configuration.use-case.ts'
import type { TestConnectionUseCase } from '../application/test-connection.use-case.ts'
import type { UpdateConfigurationUseCase } from '../application/update-configuration.use-case.ts'

export class ConfigurationController {
	private readonly getConfigurationUseCase: GetConfigurationUseCase
	private readonly updateConfigurationUseCase: UpdateConfigurationUseCase
	private readonly testConnectionUseCase: TestConnectionUseCase

	constructor(
		getConfigurationUseCase: GetConfigurationUseCase,
		updateConfigurationUseCase: UpdateConfigurationUseCase,
		testConnectionUseCase: TestConnectionUseCase,
	) {
		this.getConfigurationUseCase = getConfigurationUseCase
		this.updateConfigurationUseCase = updateConfigurationUseCase
		this.testConnectionUseCase = testConnectionUseCase
	}

	get = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const config = await this.getConfigurationUseCase.execute()
			const dto = ConfigurationResponseMapper.toDto(config)
			res.status(200).json({ data: dto })
		} catch (err) {
			next(err)
		}
	}

	update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const body = (req.body || {}) as Record<string, unknown>
			const patch = ConfigurationRequestMapper.toUpdateInput(body)
			const updated = await this.updateConfigurationUseCase.execute(patch)
			const dto = ConfigurationResponseMapper.toDto(updated)
			res.status(200).json({ data: dto })
		} catch (err) {
			next(err)
		}
	}

	testConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const input = ConfigurationRequestMapper.toTestConnectionInput(req.body || {})
			const result = await this.testConnectionUseCase.execute(input)
			res.status(200).json({
				ok: result.ok,
				message: result.message,
				data: {
					connected: result.ok,
					ok: result.ok,
					message: result.message,
					total_contracts: result.totalContracts,
				},
			})
		} catch (err) {
			next(err)
		}
	}
}
