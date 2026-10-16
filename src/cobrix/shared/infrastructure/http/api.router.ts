/**
 * Cobrix Central API Router
 * Dispatches all /api/v1/* routes, /api/v1/openapi.json, and /docs Swagger UI
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
	ConfigurationController,
	dispatchConfigurationRoutes,
	GetConfigurationUseCase,
	SqliteConfigurationRepository,
	TestConnectionUseCase,
	UpdateConfigurationUseCase,
} from '../../../features/configuration/index.ts'
import {
	SqliteContractRepository,
} from '../../../features/contracts/index.ts'
import {
	CustomerController,
	CustomerDossierEnricherService,
	dispatchCustomerRoutes,
	GetCustomerDossierUseCase,
	ListCustomersUseCase,
	SqliteCustomerRepository,
} from '../../../features/customers/index.ts'
import {
	dispatchImportRoutes,
	ImportController,
	ImportInstallmentsUseCase,
	IspBillingApiAdapter,
	SqliteImportRepository,
} from '../../../features/import/index.ts'
import {
	SqliteInvoiceRepository,
} from '../../../features/invoices/index.ts'
import {
	dispatchPaymentRoutes,
	IspPaymentBillingApiAdapter,
	PaymentController,
	ReconcilePaymentsUseCase,
	SqlitePaymentRepository,
} from '../../../features/payments/index.ts'
import {
	dispatchRunsRoutes,
	GetRecentRunsUseCase,
	GetRunDetailUseCase,
	RunsController,
	SqliteRunsRepository,
} from '../../../features/runs/index.ts'
import { BillingApiClient } from '../billing-api.client.ts'
import type { DatabaseClient } from '../database/database.client.ts'
import { OPENAPI_SPEC, serveSwaggerUI } from '../openapi/openapi.ts'

export interface CobrixApiRouterOptions {
	db: DatabaseClient
	billingApiUrl?: string
}

export class CobrixApiRouter {
	private readonly configController: ConfigurationController
	private readonly customerController: CustomerController
	private readonly importController: ImportController
	private readonly paymentController: PaymentController
	private readonly runsController: RunsController

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
		this.configController = new ConfigurationController(getConfigUseCase, updateConfigUseCase, testConnUseCase)
		this.customerController = new CustomerController(listCustomersUseCase, getCustomerDossierUseCase)
		this.importController = new ImportController(importUseCase)
		this.paymentController = new PaymentController(reconcileUseCase)
		this.runsController = new RunsController(getRecentRunsUseCase, getRunDetailUseCase)
	}

	handle(req: IncomingMessage, res: ServerResponse): boolean {
		const url = new URL(req.url ?? '/', `http://${req.headers.host || '127.0.0.1'}`)
		const pathname = url.pathname

		// OpenAPI Spec & Swagger UI
		if (req.method === 'GET' && pathname === '/api/v1/openapi.json') {
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify(OPENAPI_SPEC, null, 2))
			return true
		}

		if (req.method === 'GET' && (pathname === '/docs' || pathname === '/docs/')) {
			serveSwaggerUI(req, res)
			return true
		}

		// Feature Routes
		if (dispatchConfigurationRoutes(req, res, pathname, this.configController)) return true
		if (dispatchCustomerRoutes(req, res, pathname, url, this.customerController)) return true
		if (dispatchImportRoutes(req, res, pathname, url, this.importController)) return true
		if (dispatchPaymentRoutes(req, res, pathname, url, this.paymentController)) return true
		if (dispatchRunsRoutes(req, res, pathname, url, this.runsController)) return true

		return false
	}
}
