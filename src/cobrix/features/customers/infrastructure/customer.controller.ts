/**
 * Customer REST Controller
 * Handles HTTP requests and delegates to application use cases
 */

import type { NextFunction, Request, Response } from 'express'
import { NotFoundError } from '../../../shared/domain/errors/app.errors.ts'
import { CustomerRequestMapper } from './customer.request.mapper.ts'
import { CustomerResponseMapper } from '../application/customer.response.mapper.ts'
import type { GetCustomerDossierUseCase, ListCustomersUseCase } from '../application/index.ts'

export class CustomerController {
	private readonly listCustomersUseCase: ListCustomersUseCase
	private readonly getCustomerDossierUseCase: GetCustomerDossierUseCase

	constructor(
		listCustomersUseCase: ListCustomersUseCase,
		getCustomerDossierUseCase: GetCustomerDossierUseCase
	) {
		this.listCustomersUseCase = listCustomersUseCase
		this.getCustomerDossierUseCase = getCustomerDossierUseCase
	}

	async list(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const query = CustomerRequestMapper.toListQuery(req.query)
			const customers = await this.listCustomersUseCase.execute(query.q)
			const dtos = customers.map(CustomerResponseMapper.toSummaryDto)
			res.status(200).json({ data: dtos })
		} catch (err) {
			next(err)
		}
	}

	async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const params = CustomerRequestMapper.toParams(req.params)
			const dossier = await this.getCustomerDossierUseCase.execute(params.id)
			if (!dossier) {
				throw new NotFoundError(`Customer with ID '${params.id}' not found`)
			}
			const dto = CustomerResponseMapper.toDossierDto(dossier)
			res.status(200).json({ data: dto })
		} catch (err) {
			next(err)
		}
	}
}
