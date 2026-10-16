/**
 * Configuration REST Controller
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRFC9457Error } from '../../../shared/infrastructure/middleware/rfc9457-error-handler.ts'
import { ConfigurationResponseMapper } from '../application/configuration.response.mapper.ts'
import type {
	GetConfigurationUseCase,
	TestConnectionUseCase,
	UpdateConfigurationUseCase,
} from '../application/configuration.use-cases.ts'

async function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		req.on('data', chunk => chunks.push(Buffer.from(chunk)))
		req.on('end', () => {
			const raw = Buffer.concat(chunks).toString('utf-8')
			if (!raw.trim()) {
				resolve({} as T)
				return
			}
			try {
				resolve(JSON.parse(raw) as T)
			} catch (e) {
				reject(e)
			}
		})
		req.on('error', reject)
	})
}

export class ConfigurationController {
	private readonly getUseCase: GetConfigurationUseCase
	private readonly updateUseCase: UpdateConfigurationUseCase
	private readonly testConnectionUseCase: TestConnectionUseCase

	constructor(
		getUseCase: GetConfigurationUseCase,
		updateUseCase: UpdateConfigurationUseCase,
		testConnectionUseCase: TestConnectionUseCase
	) {
		this.getUseCase = getUseCase
		this.updateUseCase = updateUseCase
		this.testConnectionUseCase = testConnectionUseCase
	}

	async get(req: IncomingMessage, res: ServerResponse): Promise<void> {
		try {
			const config = await this.getUseCase.execute()
			const dto = ConfigurationResponseMapper.toDto(config)
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify({ data: dto }))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}

	async update(req: IncomingMessage, res: ServerResponse): Promise<void> {
		try {
			const body = await parseJsonBody<Record<string, unknown>>(req)
			const patch: Record<string, unknown> = {}

			if ('company_name' in body) patch.companyName = body.company_name
			if ('company_tax_id' in body) patch.companyTaxId = body.company_tax_id
			if ('billing_email' in body) patch.billingEmail = body.billing_email
			if ('api_url' in body) patch.apiUrl = body.api_url
			if ('api_user' in body) patch.apiUser = body.api_user
			if ('api_password' in body) patch.apiPassword = body.api_password
			if ('importable_statuses' in body) patch.importableStatuses = body.importable_statuses
			if ('import_window_months' in body) patch.importWindowMonths = body.import_window_months
			if ('max_recent_installments' in body) patch.maxRecentInstallments = body.max_recent_installments
			if ('grace_days' in body) patch.graceDays = Number(body.grace_days)
			if ('max_new_invoices' in body) patch.maxNewInvoices = body.max_new_invoices
			if ('max_new_amount' in body) patch.maxNewAmount = body.max_new_amount
			if ('excluded_doc_types' in body) patch.excludedDocTypes = body.excluded_doc_types
			if ('auto_run_hour' in body) patch.autoRunHour = body.auto_run_hour
			if ('auto_run_enabled' in body) patch.autoRunEnabled = Boolean(body.auto_run_enabled)

			const updated = await this.updateUseCase.execute(patch)
			const dto = ConfigurationResponseMapper.toDto(updated)
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify({ data: dto, message: 'Configuración actualizada exitosamente' }))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}

	async testConnection(req: IncomingMessage, res: ServerResponse): Promise<void> {
		try {
			const body = await parseJsonBody<{ api_url?: string; api_user?: string; api_password?: string }>(req)
			const result = await this.testConnectionUseCase.execute({
				apiUrl: body.api_url,
				apiUser: body.api_user,
				apiPassword: body.api_password,
			})
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(result.ok ? 200 : 400)
			res.end(JSON.stringify(result))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}
}
