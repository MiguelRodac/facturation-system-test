/**
 * Cobrix Central API Router
 * Dispatches all /api/v1/* routes, /api/v1/openapi.json, and /docs Swagger UI using Express
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import express, { type Express } from 'express'
import {
	ConfigurationController,
	createConfigurationRouter,
	GetConfigurationUseCase,
	SqliteConfigurationRepository,
	TestConnectionUseCase,
	UpdateConfigurationUseCase,
} from '../../../features/configuration/index.ts'
import { SqliteContractRepository } from '../../../features/contracts/index.ts'
import {
	createCustomerRouter,
	CustomerController,
	CustomerDossierEnricherService,
	GetCustomerDossierUseCase,
	ListCustomersUseCase,
	SqliteCustomerRepository,
} from '../../../features/customers/index.ts'
import {
	createImportRouter,
	ImportController,
	ImportInstallmentsUseCase,
	IspBillingApiAdapter,
	SqliteImportRepository,
} from '../../../features/import/index.ts'
import { SqliteInvoiceRepository } from '../../../features/invoices/index.ts'
import {
	createPaymentRouter,
	IspPaymentBillingApiAdapter,
	PaymentController,
	ReconcilePaymentsUseCase,
	SqlitePaymentRepository,
} from '../../../features/payments/index.ts'
import {
	createRunsRouter,
	GetRecentRunsUseCase,
	GetRunDetailUseCase,
	RunsController,
	SqliteRunsRepository,
} from '../../../features/runs/index.ts'
import { BillingApiClient } from '../billing-api.client.ts'
import type { DatabaseClient } from '../database/database.client.ts'
import { rfc9457ErrorMiddleware } from '../middleware/rfc9457-error-handler.ts'
import { OPENAPI_SPEC, serveSwaggerUI } from '../openapi/openapi.ts'

export interface CobrixApiRouterOptions {
	db: DatabaseClient
	billingApiUrl?: string
}

export class CobrixApiRouter {
	readonly app: Express

	constructor(options: CobrixApiRouterOptions) {
		const { db } = options

		// Repositories (Strict Single-Table per repository)
		const configRepo = new SqliteConfigurationRepository(db)
		const contractRepo = new SqliteContractRepository(db)
		const invoiceRepo = new SqliteInvoiceRepository(db)
		const customerRepo = new SqliteCustomerRepository(db)
		const runsRepo = new SqliteRunsRepository(db)
		const importRepo = new SqliteImportRepository(db)
		const paymentRepo = new SqlitePaymentRepository(db)

		// Adapters
		const getBillingClient = () => {
			const configRow = db.queryOne<{ api_url: string; api_user: string; api_password: string }>(
				'SELECT api_url, api_user, api_password FROM company_config WHERE id = 1'
			)
			const baseUrl = (configRow && configRow.api_url !== 'http://127.0.0.1:4310')
				? configRow.api_url
				: (options.billingApiUrl || configRow?.api_url || 'http://127.0.0.1:4310')

			return new BillingApiClient({
				baseUrl,
				username: configRow?.api_user || 'cobrix',
				password: configRow?.api_password || 'cobrix-sandbox',
			})
		}
		const importBillingAdapter = new IspBillingApiAdapter(getBillingClient)
		const paymentBillingAdapter = new IspPaymentBillingApiAdapter(getBillingClient)

		// Application Services
		const customerEnricher = new CustomerDossierEnricherService()

		// Use Cases
		const getConfigUseCase = new GetConfigurationUseCase(configRepo)
		const updateConfigUseCase = new UpdateConfigurationUseCase(configRepo)
		const testConnUseCase = new TestConnectionUseCase(configRepo)

		const listCustomersUseCase = new ListCustomersUseCase(customerRepo, contractRepo, invoiceRepo, customerEnricher)
		const getCustomerDossierUseCase = new GetCustomerDossierUseCase(customerRepo, contractRepo, invoiceRepo, customerEnricher)

		const importUseCase = new ImportInstallmentsUseCase(importBillingAdapter, importRepo, configRepo)
		const reconcileUseCase = new ReconcilePaymentsUseCase(paymentBillingAdapter, paymentRepo)

		const getRecentRunsUseCase = new GetRecentRunsUseCase(runsRepo)
		const getRunDetailUseCase = new GetRunDetailUseCase(runsRepo)

		// Controllers
		const configController = new ConfigurationController(getConfigUseCase, updateConfigUseCase, testConnUseCase)
		const customerController = new CustomerController(listCustomersUseCase, getCustomerDossierUseCase)
		const importController = new ImportController(importUseCase)
		const paymentController = new PaymentController(reconcileUseCase)
		const runsController = new RunsController(getRecentRunsUseCase, getRunDetailUseCase)

		// Initialize Express App
		this.app = express()
		this.app.use(express.json())

		// OpenAPI Spec & Swagger UI
		this.app.get('/api/v1/openapi.json', (_req, res) => {
			res.status(200).json(OPENAPI_SPEC)
		})
		this.app.use('/docs', (req, res) => {
			serveSwaggerUI(req, res)
		})

		// Feature Routers
		this.app.use('/api/v1/config', createConfigurationRouter(configController))
		this.app.use('/api/v1/customers', createCustomerRouter(customerController))
		this.app.use('/api/v1/sync', createImportRouter(importController))
		this.app.use('/api/v1/sync', createPaymentRouter(paymentController))
		this.app.use('/api/v1/sync', createRunsRouter(runsController))

		// RFC 9457 Global Error Handler
		this.app.use(rfc9457ErrorMiddleware)
	}

	handle(req: IncomingMessage, res: ServerResponse): boolean {
		const url = new URL(req.url ?? '/', `http://${req.headers.host || '127.0.0.1'}`)
		const pathname = url.pathname

		if (pathname.startsWith('/api/v1') || pathname === '/docs' || pathname.startsWith('/docs/')) {
			this.app(req, res)
			return true
		}

		return false
	}
}
