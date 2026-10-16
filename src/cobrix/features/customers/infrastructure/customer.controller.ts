/**
 * Customer REST Controller
 * Handles HTTP requests and delegates to application use cases
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { NotFoundError } from '../../../shared/domain/errors/app.errors.ts'
import { handleRFC9457Error } from '../../../shared/infrastructure/middleware/rfc9457-error-handler.ts'
import { CustomerResponseMapper } from '../application/customer.response.mapper.ts'
import type { GetCustomerDossierUseCase, ListCustomersUseCase } from '../application/customer.use-cases.ts'

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

	async list(req: IncomingMessage, res: ServerResponse, query?: string): Promise<void> {
		try {
			const customers = await this.listCustomersUseCase.execute(query)
			const dtos = customers.map(CustomerResponseMapper.toSummaryDto)
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify({ data: dtos }))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}

	async getById(req: IncomingMessage, res: ServerResponse, customerId: string): Promise<void> {
		try {
			const dossier = await this.getCustomerDossierUseCase.execute(customerId)
			if (!dossier) {
				throw new NotFoundError(`Customer with ID '${customerId}' not found`)
			}
			const dto = CustomerResponseMapper.toDossierDto(dossier)
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify({ data: dto }))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}
}
