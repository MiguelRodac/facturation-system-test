/**
 * Web Application & Operational Panel (§3)
 *
 * Implements Cobrix's operational web console on port 4300:
 * - Summary (§3.8)
 * - Customers Table & Dossier (§3.5, §3.6)
 * - Synchronization: Import & Payments with Simulation (§3.2, §3.3, §3.4)
 * - Configuration & Connection Testing (§3.1)
 *
 * Fallback to skeleton mode if cobrixDbPath is not provided (preserves test/entorno.test.ts).
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import { BillingApiClient } from '../cobrix/shared/infrastructure/billing-api.client.ts'
import { SqliteDatabaseClient } from '../cobrix/shared/infrastructure/database/database.client.ts'
import { createCobrixDatabase } from '../cobrix/shared/infrastructure/database/database.ts'

import {
	GetConfigurationUseCase,
	SqliteConfigurationRepository,
	UpdateConfigurationUseCase,
} from '../cobrix/features/configuration/index.ts'
import {
	SqliteContractRepository,
} from '../cobrix/features/contracts/index.ts'
import {
	SqliteInvoiceRepository,
} from '../cobrix/features/invoices/index.ts'
import {
	CustomerDossierEnricherService,
	GetCustomerDossierUseCase,
	ListCustomersUseCase,
	SqliteCustomerRepository,
} from '../cobrix/features/customers/index.ts'
import {
	ImportInstallmentsUseCase,
	IspBillingApiAdapter,
	SimulateImportUseCase,
	SqliteImportRepository,
} from '../cobrix/features/import/index.ts'
import {
	IspPaymentBillingApiAdapter,
	ReconcilePaymentsUseCase,
	SimulatePaymentsUseCase,
	SqlitePaymentRepository,
} from '../cobrix/features/payments/index.ts'
import {
	GetRecentRunsUseCase,
	GetRunDetailUseCase,
	SqliteRunsRepository,
} from '../cobrix/features/runs/index.ts'
import { BackgroundScheduler, CobrixApiRouter } from '../cobrix/shared/index.ts'

import {
	CONTRACT_STATUS_TONE,
	CSS,
	date,
	dateTime,
	esc,
	html,
	layout,
	period,
	pill,
	type Raw,
	type Tone,
	usd,
} from './layout.ts'

export interface AppDeps {
	/** The local invoice manager API. */
	readonly simulatorUrl: string
	/** Path of docs/ENUNCIADO.md, served at /enunciado. */
	readonly assignmentPath: string
	/** Optional path to Cobrix SQLite DB. */
	readonly cobrixDbPath?: string
}

interface Screen {
	readonly title: string
	readonly purpose: string
	readonly section: string
	readonly todo: readonly string[]
}

const SCREENS: Record<string, Screen> = {
	'/': {
		title: 'Resumen',
		purpose: 'Vista general de la integración con el administrador de facturas.',
		section: '3.8',
		todo: [
			'Totales: clientes importados, contratos, facturas abiertas y pagadas, monto por cobrar.',
			'Datos del proveedor configurado y si la corrida automática está activa.',
			'Últimas corridas con su resultado.',
			'Accesos rápidos a «Importar» y «Actualizar pagadas».',
		],
	},
	'/clientes': {
		title: 'Clientes',
		purpose: 'Tabla de los clientes importados desde el administrador.',
		section: '3.5',
		todo: [
			'Un cliente por cédula o RIF (los contratos del mismo titular se agrupan).',
			'Columnas: nombre, documento, tipo (natural o jurídico), contratos, facturas abiertas y pagadas, deuda y vencimiento más antiguo.',
			'Búsqueda por nombre, cédula o RIF.',
			'Cada fila abre el expediente del cliente.',
		],
	},
	'/clientes/expediente': {
		title: 'Expediente del cliente',
		purpose: 'Todo lo que Cobrix sabe de un cliente.',
		section: '3.6',
		todo: [
			'Datos del cliente: documento, correo, teléfono, origen.',
			'Contratos en el administrador con estado, plan y sucursal.',
			'Facturas: número de Cobrix, cuota del administrador, periodo, vencimiento, corte, total, saldo y estado.',
			'Historial: cliente creado, factura importada, factura pagada en el ISP.',
		],
	},
	'/sincronizacion': {
		title: 'Sincronización',
		purpose: 'Las dos corridas que traen los datos del administrador a Cobrix.',
		section: '3.2 a 3.4',
		todo: [
			'«Importar» y «Simular importación» (la simulación cuenta sin escribir nada).',
			'«Actualizar pagadas» y «Simular actualización».',
			'Historial de corridas: tipo, fecha, si fue simulación, estado y resultado.',
			'Detalle de cada corrida: contadores y una fila por cuota con su resultado y motivo.',
		],
	},
	'/configuracion': {
		title: 'Configuración',
		purpose: 'Datos de la empresa y del proveedor.',
		section: '3.1',
		todo: [
			'Empresa: nombre, RIF y correo de cobranza.',
			'Proveedor: URL de la API, usuario y contraseña, con un botón «Probar conexión».',
			'Estados de contrato que se importan (por defecto ACTIVO y CORTADO).',
			'Ventana de importación, máximo de cuotas recientes, días de gracia, topes por corrida y exclusión por tipo de documento.',
			'Corrida automática diaria a una hora elegida.',
		],
	},
}

export function createApp(deps: AppDeps): Server {
	const isOperational = Boolean(deps.cobrixDbPath)
	let dbClient: SqliteDatabaseClient | null = null
	let apiRouter: CobrixApiRouter | null = null
	let scheduler: BackgroundScheduler | null = null

	if (isOperational && deps.cobrixDbPath) {
		const instance = createCobrixDatabase(deps.cobrixDbPath)
		dbClient = new SqliteDatabaseClient(instance.db)
		apiRouter = new CobrixApiRouter({ db: dbClient, billingApiUrl: deps.simulatorUrl })
		scheduler = new BackgroundScheduler(dbClient, {
			onTrigger: async () => {
				if (!dbClient) return
			const configRepo = new SqliteConfigurationRepository(dbClient)
			const importRepo = new SqliteImportRepository(dbClient)
			const paymentRepo = new SqlitePaymentRepository(dbClient)

			const getBillingClient = () => {
				const configRow = dbClient?.queryOne<{ api_url: string; api_user: string; api_password: string }>(
					'SELECT api_url, api_user, api_password FROM company_config WHERE id = 1'
				)
				const baseUrl = (configRow && configRow.api_url !== 'http://127.0.0.1:4310')
					? configRow.api_url
					: (deps.simulatorUrl || configRow?.api_url || 'http://127.0.0.1:4310')

				return new BillingApiClient({
					baseUrl,
					username: configRow?.api_user || 'cobrix',
					password: configRow?.api_password || 'cobrix-sandbox',
				})
			}

			const importBilling = new IspBillingApiAdapter(getBillingClient)
			const paymentBilling = new IspPaymentBillingApiAdapter(getBillingClient)

			const importUseCase = new ImportInstallmentsUseCase(importBilling, importRepo, configRepo)
			const reconcileUseCase = new ReconcilePaymentsUseCase(paymentBilling, paymentRepo)

			const importRes = await importUseCase.execute({ isSimulation: false })
			console.log(`[SYNC ENGINE] 📥 Importación automática completada: ${importRes.importedInvoicesCount} facturas importadas`)

			const paymentRes = await reconcileUseCase.execute({ isSimulation: false })
			console.log(`[SYNC ENGINE] 💳 Conciliación automática completada: ${paymentRes.paidInvoicesCount} facturas marcadas pagadas`)
		}})
		scheduler.start()
	}

	function placeholder(path: string): Raw {
		const screen = SCREENS[path]!
		return html`
			<div class="head"><div><h1>${screen.title} ${pill('Por implementar', 'warn')}</h1><p>${screen.purpose}</p></div></div>
			<section class="card"><header><h2>Qué debe hacer esta pantalla</h2><a href="/enunciado">Enunciado §${screen.section}</a></header>
				<div class="body"><ul class="todo">${screen.todo.map(item => html`<li>${item}</li>`)}</ul></div></section>
			${path === '/' ? html`
				<section class="card"><header><h2>Cómo empezar</h2></header><div class="body"><ol class="todo">
					<li>Lee el <a href="/enunciado">enunciado</a>: qué construir, reglas y criterios de aceptación.</li>
					<li>Explora la API en <a href="${deps.simulatorUrl}/docs" target="_blank" rel="noopener">Swagger</a> (usuario <span class="mono">cobrix</span>, contraseña <span class="mono">cobrix-sandbox</span>).</li>
					<li>Para crear pagos del lado del ISP y probar tu «Actualizar pagadas», usa la sección <strong>Simulador</strong> del Swagger (<span class="mono">POST /__sim/pagar</span>).</li>
					<li>Implementa las pantallas de este menú.</li>
				</ol></div></section>` : ''}`
	}

	function assignmentPage(): Raw {
		let text = ''
		try {
			text = readFileSync(deps.assignmentPath, 'utf8')
		} catch {
			text = 'No se encontró docs/ENUNCIADO.md.'
		}
		return html`<div class="head"><div><h1>Enunciado</h1><p>También en <span class="mono">docs/ENUNCIADO.md</span>.</p></div></div>
			<section class="card"><div class="body"><pre class="doc">${text}</pre></div></section>`
	}

	async function parseBody(req: IncomingMessage): Promise<URLSearchParams> {
		return new Promise((resolve, reject) => {
			let data = ''
			req.on('data', chunk => {
				data += chunk
			})
			req.on('end', () => {
				resolve(new URLSearchParams(data))
			})
			req.on('error', err => reject(err))
		})
	}

	async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const url = new URL(req.url ?? '/', 'http://prueba.local')
		const path = url.pathname.replace(/\/+$/, '') || '/'
		const text = url.searchParams.get('msg')
		const tone = url.searchParams.get('tone') as Tone | null
		const flash = text && tone ? { tone, text } : undefined

		// If skeleton mode (no DB specified), serve the original placeholders
		if (!isOperational || !dbClient) {
			const company = 'Tu empresa (por configurar)'
			const page = (title: string, active: string, body: Raw) => sendHtml(res, 200, layout({ title, active, body, flash, company }))

			if (req.method === 'GET') {
				if (path === '/app.css') return send(res, 200, CSS + SKELETON_CSS, 'text/css; charset=utf-8')
				if (path === '/enunciado') return page('Enunciado', '', assignmentPage())
				if (/^\/clientes\/[^/]+$/.test(path)) return page('Expediente', '/clientes', placeholder('/clientes/expediente'))
				if (SCREENS[path]) return page(SCREENS[path].title, path, placeholder(path))
			}
			return sendHtml(res, 404, layout({ title: 'No encontrado', active: '', company, body: html`<h1>No encontrado</h1><p><a href="/">Volver</a></p>` }))
		}

		// Operational Mode
		if (apiRouter && apiRouter.handle(req, res)) {
			return
		}

		// Serve compiled React SPA under /app/
		const frontendDist = join(process.cwd(), 'dist', 'web')
		if (existsSync(frontendDist) && (url.pathname === '/app' || url.pathname.startsWith('/app/'))) {
			if (req.method !== 'GET') {
				return send(res, 405, 'Method Not Allowed', 'text/plain')
			}
			if (url.pathname === '/app') {
				res.writeHead(302, { Location: '/app/' })
				res.end()
				return
			}
			const relativeAsset = url.pathname.replace(/^\/app\//, '')
			const assetPath = join(frontendDist, relativeAsset)
			if (existsSync(assetPath) && !statSync(assetPath).isDirectory()) {
				const ext = extname(assetPath).toLowerCase()
				const mimeMap: Record<string, string> = {
					'.html': 'text/html; charset=utf-8',
					'.js': 'application/javascript; charset=utf-8',
					'.css': 'text/css; charset=utf-8',
					'.json': 'application/json; charset=utf-8',
					'.svg': 'image/svg+xml',
					'.png': 'image/png',
					'.ico': 'image/x-icon',
				}
				const contentType = mimeMap[ext] || 'application/octet-stream'
				const content = readFileSync(assetPath)
				res.writeHead(200, { 'Content-Type': contentType })
				res.end(content)
				return
			}
			const indexHtml = readFileSync(join(frontendDist, 'index.html'), 'utf8')
			return send(res, 200, indexHtml, 'text/html; charset=utf-8')
		}

		const configRepo = new SqliteConfigurationRepository(dbClient)
		const getConfigUseCase = new GetConfigurationUseCase(configRepo)
		const updateConfigUseCase = new UpdateConfigurationUseCase(configRepo)

		const runsRepo = new SqliteRunsRepository(dbClient)
		const getRecentRunsUseCase = new GetRecentRunsUseCase(runsRepo)
		const getRunDetailUseCase = new GetRunDetailUseCase(runsRepo)

		const contractRepo = new SqliteContractRepository(dbClient)
		const invoiceRepo = new SqliteInvoiceRepository(dbClient)
		const customerRepo = new SqliteCustomerRepository(dbClient)
		const customerEnricher = new CustomerDossierEnricherService()
		const listCustomersUseCase = new ListCustomersUseCase(customerRepo, contractRepo, invoiceRepo, customerEnricher)
		const getCustomerDossierUseCase = new GetCustomerDossierUseCase(customerRepo, contractRepo, invoiceRepo, customerEnricher)

		const config = await getConfigUseCase.execute()
		const company = config.companyName

		const page = (title: string, active: string, body: Raw) =>
			sendHtml(res, 200, layout({ title, active, body, flash, company }))

		// Static assets
		if (req.method === 'GET' && path === '/app.css') {
			return send(res, 200, CSS + SKELETON_CSS, 'text/css; charset=utf-8')
		}
		if (req.method === 'GET' && path === '/enunciado') {
			return page('Enunciado', '', assignmentPage())
		}

		// GET / (Resumen §3.8)
		if (req.method === 'GET' && path === '/') {
			const counts = dbClient.queryOne<{
				customers: number
				contracts: number
				open_invoices: number
				paid_invoices: number
				total_debt: number
			}>(`
				SELECT 
					(SELECT COUNT(*) FROM customer) AS customers,
					(SELECT COUNT(*) FROM contract) AS contracts,
					(SELECT COUNT(*) FROM invoice WHERE status = 'OPEN') AS open_invoices,
					(SELECT COUNT(*) FROM invoice WHERE status = 'PAID') AS paid_invoices,
					(SELECT COALESCE(SUM(balance), 0) FROM invoice WHERE status = 'OPEN') AS total_debt
			`) ?? { customers: 0, contracts: 0, open_invoices: 0, paid_invoices: 0, total_debt: 0 }

			const runs = await getRecentRunsUseCase.execute(5)

			const body = html`
				<div class="head">
					<div>
						<h1>Resumen</h1>
						<p>Vista general de la integración técnica de cobranza con el administrador de facturas.</p>
					</div>
					<div class="actions">
						<form method="POST" action="/sincronizacion/importar" class="inline">
							<button type="submit" class="btn primary">Importar ahora</button>
						</form>
						<form method="POST" action="/sincronizacion/pagadas" class="inline">
							<button type="submit" class="btn">Actualizar pagadas</button>
						</form>
					</div>
				</div>

				<div class="tiles">
					<div class="tile"><span>Clientes importados</span><strong>${counts.customers}</strong></div>
					<div class="tile"><span>Contratos</span><strong>${counts.contracts}</strong></div>
					<div class="tile"><span>Facturas abiertas</span><strong>${counts.open_invoices}</strong></div>
					<div class="tile"><span>Facturas pagadas</span><strong>${counts.paid_invoices}</strong></div>
					<div class="tile"><span>Monto por cobrar</span><strong>${usd(counts.total_debt * 100)}</strong></div>
				</div>

				<div class="grid2">
					<section class="card">
						<header><h2>Proveedor configurado</h2><a href="/configuracion">Editar configuración</a></header>
						<div class="body">
							<dl class="facts">
								<dt>API URL</dt><dd class="mono">${config.apiUrl}</dd>
								<dt>Usuario API</dt><dd class="mono">${config.apiUser}</dd>
								<dt>Estados importables</dt><dd>${config.importableStatuses.join(', ')}</dd>
								<dt>Corrida automática</dt>
								<dd>${config.autoRunEnabled ? pill(`Activa a las ${config.autoRunHour ?? '03:00'}`, 'ok') : pill('Desactivada', 'mute')}</dd>
							</dl>
						</div>
					</section>

					<section class="card">
						<header><h2>Acciones rápidas</h2></header>
						<div class="body">
							<p class="muted">Ejecuta las sincronizaciones principales o simúlalas para predecir el impacto sin tocar la base de datos.</p>
							<div class="actions">
								<form method="POST" action="/sincronizacion/importar?simular=1" class="inline">
									<button type="submit" class="btn small">Simular importación</button>
								</form>
								<form method="POST" action="/sincronizacion/pagadas?simular=1" class="inline">
									<button type="submit" class="btn small">Simular pagadas</button>
								</form>
								<a href="/sincronizacion" class="btn small">Historial completo</a>
							</div>
						</div>
					</section>
				</div>

				<section class="card">
					<header><h2>Últimas corridas de sincronización</h2><a href="/sincronizacion">Ver todas</a></header>
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>#</th><th>Tipo</th><th>Modo</th><th>Estado</th><th>Resumen</th><th>Inicio</th><th>Acción</th>
								</tr>
							</thead>
							<tbody>
								${runs.length === 0 ? html`<tr><td colspan="7" class="muted">No se han ejecutado corridas aún.</td></tr>` : runs.map(r => html`
									<tr>
										<td class="mono">#${r.id}</td>
										<td><strong>${r.type}</strong></td>
										<td>${r.isSimulation ? pill('Simulación', 'warn') : pill('Real', 'info')}</td>
										<td>${r.status === 'COMPLETED' ? pill('Completada', 'ok') : pill('Falló', 'bad')}</td>
										<td>${r.summary}</td>
										<td>${dateTime(r.startedAt)}</td>
										<td><a href="/sincronizacion/${r.id}">Ver detalle</a></td>
									</tr>
								`)}
							</tbody>
						</table>
					</div>
				</section>
			`
			return page('Resumen', '/', body)
		}

		// GET /clientes (§3.5)
		if (req.method === 'GET' && path === '/clientes') {
			const q = url.searchParams.get('q') ?? undefined
			const customers = await listCustomersUseCase.execute(q)

			const body = html`
				<div class="head">
					<div>
						<h1>Clientes</h1>
						<p>Titulares importados desde el administrador con su cartera pendiente y vencimiento más antiguo.</p>
					</div>
				</div>

				<form method="GET" action="/clientes" class="search">
					<input type="search" name="q" value="${q ?? ''}" placeholder="Buscar por nombre, cédula o RIF...">
					<button type="submit" class="btn">Buscar</button>
					${q ? html`<a href="/clientes" class="btn">Limpiar</a>` : ''}
				</form>

				<section class="card">
					<header><h2>Titulares registrados (${customers.length})</h2></header>
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Documento</th>
									<th>Nombre</th>
									<th>Tipo</th>
									<th class="num">Contratos</th>
									<th class="num">Facturas abiertas</th>
									<th class="num">Facturas pagadas</th>
									<th class="num">Deuda</th>
									<th>Vencimiento más antiguo</th>
									<th>Acción</th>
								</tr>
							</thead>
							<tbody>
								${customers.length === 0 ? html`<tr><td colspan="9" class="muted">No se encontraron clientes importados.</td></tr>` : customers.map(c => html`
									<tr>
										<td class="mono"><strong>${c.id}</strong></td>
										<td>${c.name}</td>
										<td>${c.personType === 'LEGAL' ? pill('Jurídica', 'info') : pill('Natural', 'mute')}</td>
										<td class="num">${c.contractsCount}</td>
										<td class="num">${c.openInvoicesCount}</td>
										<td class="num">${c.paidInvoicesCount}</td>
										<td class="num"><strong>${usd(c.totalDebt * 100)}</strong></td>
										<td>${date(c.oldestDueDate)}</td>
										<td><a href="/clientes/${c.id}">Ver expediente</a></td>
									</tr>
								`)}
							</tbody>
						</table>
					</div>
				</section>
			`
			return page('Clientes', '/clientes', body)
		}

		// GET /clientes/:id (Expediente §3.6)
		const clientMatch = /^\/clientes\/([^/]+)$/.exec(path)
		if (req.method === 'GET' && clientMatch) {
			const customerId = clientMatch[1]!
			const dossier = await getCustomerDossierUseCase.execute(customerId)
			if (!dossier) {
				return sendHtml(res, 404, layout({ title: 'Cliente no encontrado', active: '/clientes', company, body: html`<h1>Cliente no encontrado</h1><p><a href="/clientes">Volver a clientes</a></p>` }))
			}

			const { profile, contracts, invoices, totals, timeline } = dossier

			const body = html`
				<div class="head">
					<div>
						<h1>${profile.name} ${profile.personType === 'LEGAL' ? pill('Persona Jurídica', 'info') : pill('Persona Natural', 'mute')}</h1>
						<p>Expediente consolidado del titular · Cédula/RIF: <span class="mono">${profile.id}</span></p>
					</div>
					<div><a href="/clientes" class="btn">Volver a clientes</a></div>
				</div>

				<div class="tiles">
					<div class="tile"><span>Deuda pendiente</span><strong>${usd(totals.totalDebt * 100)}</strong></div>
					<div class="tile"><span>Facturas abiertas</span><strong>${totals.openCount}</strong></div>
					<div class="tile"><span>Facturas pagadas</span><strong>${totals.paidCount}</strong></div>
					<div class="tile"><span>Contratos</span><strong>${totals.contractsCount}</strong></div>
				</div>

				<div class="grid2">
					<section class="card">
						<header><h2>Datos del cliente</h2></header>
						<div class="body">
							<dl class="facts">
								<dt>Identificación</dt><dd class="mono">${profile.id}</dd>
								<dt>Correo</dt><dd>${profile.email || '—'}</dd>
								<dt>Teléfono</dt><dd>${profile.phone || '—'}</dd>
								<dt>Dirección</dt><dd>${profile.address || '—'}</dd>
								<dt>Origen</dt><dd>${profile.origin}</dd>
								<dt>Fecha de alta</dt><dd>${dateTime(profile.createdAt)}</dd>
							</dl>
						</div>
					</section>

					<section class="card">
						<header><h2>Contratos en el administrador</h2></header>
						<div class="table-wrap">
							<table>
								<thead><tr><th>ID / Código</th><th>Estado</th><th>Plan</th><th class="num">Precio</th><th>Sucursal</th></tr></thead>
								<tbody>
									${contracts.map(c => html`
										<tr>
											<td class="mono">${c.id}</td>
											<td>${pill(c.status, CONTRACT_STATUS_TONE[c.status] ?? 'mute')}</td>
											<td>${c.planName}</td>
											<td class="num">${usd(c.planPrice * 100)}</td>
											<td>${c.branchName || '—'}</td>
										</tr>
									`)}
								</tbody>
							</table>
						</div>
					</section>
				</div>

				<section class="card">
					<header><h2>Facturas</h2></header>
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Cobrix #</th><th>Cuota ISP</th><th>Contrato</th><th>Periodo</th><th>Vencimiento</th><th>Corte</th>
									<th class="num">Total</th><th class="num">Saldo</th><th>Estado</th><th>Pagada el</th><th>Recibo ISP</th>
								</tr>
							</thead>
							<tbody>
								${invoices.map(inv => html`
									<tr>
										<td class="mono">FAC-${String(inv.id).padStart(4, '0')}</td>
										<td class="mono">${inv.externalInstallmentId}</td>
										<td class="mono">${inv.contractId}</td>
										<td>${period(inv.period)}</td>
										<td>${date(inv.dueDate)}</td>
										<td>${date(inv.cutoffDate)}</td>
										<td class="num">${usd(inv.totalAmount * 100)}</td>
										<td class="num"><strong>${usd(inv.balance * 100)}</strong></td>
										<td>
											${inv.status === 'PAID' ? pill('PAGADA', 'ok') : inv.isPartialPayment ? pill('ABONO PARCIAL', 'warn') : pill('ABIERTA', 'bad')}
										</td>
										<td>${inv.paidAt ? dateTime(inv.paidAt) : '—'}</td>
										<td class="mono">${inv.paidByInvoiceNumber || '—'}</td>
									</tr>
								`)}
							</tbody>
						</table>
					</div>
				</section>

				<section class="card">
					<header><h2>Línea de tiempo / Historial</h2></header>
					<div class="body">
						<ul class="timeline">
							${timeline.map(e => html`
								<li>
									<time>${dateTime(e.date)}</time>
									<div>
										<strong>${e.title}</strong> ${pill(e.tone.toUpperCase(), e.tone)}
										<p class="muted" style="margin:2px 0 0;">${e.description}</p>
									</div>
								</li>
							`)}
						</ul>
					</div>
				</section>
			`
			return page('Expediente', '/clientes', body)
		}

		// GET /sincronizacion (§3.2 a §3.4)
		if (req.method === 'GET' && path === '/sincronizacion') {
			const runs = await getRecentRunsUseCase.execute(50)

			const body = html`
				<div class="head">
					<div>
						<h1>Sincronización</h1>
						<p>Acciones de importación y actualización de facturas pagadas contra la API del administrador.</p>
					</div>
				</div>

				<div class="grid2">
					<section class="card">
						<header><h2>1. Importar clientes y facturas</h2><a href="/enunciado">§3.2</a></header>
						<div class="body">
							<p class="muted">Recorre todos los contratos del ISP y crea clientes y facturas abiertas según las reglas de corte y ventana.</p>
							<div class="actions">
								<form method="POST" action="/sincronizacion/importar?simular=1" class="inline">
									<button type="submit" class="btn">Simular importación</button>
								</form>
								<form method="POST" action="/sincronizacion/importar" class="inline">
									<button type="submit" class="btn primary">Importar definitivamente</button>
								</form>
							</div>
						</div>
					</section>

					<section class="card">
						<header><h2>2. Actualizar facturas pagadas</h2><a href="/enunciado">§3.3</a></header>
						<div class="body">
							<p class="muted">Revisa las facturas abiertas de Cobrix contra el libro de pagos del ISP y marca pagadas las acreditadas en caja.</p>
							<div class="actions">
								<form method="POST" action="/sincronizacion/pagadas?simular=1" class="inline">
									<button type="submit" class="btn">Simular actualización</button>
								</form>
								<form method="POST" action="/sincronizacion/pagadas" class="inline">
									<button type="submit" class="btn primary">Actualizar pagadas</button>
								</form>
							</div>
						</div>
					</section>
				</div>

				<section class="card">
					<header><h2>Historial de corridas de sincronización</h2></header>
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>#</th><th>Tipo</th><th>Modo</th><th>Estado</th><th>Resumen</th><th>Inicio</th><th>Fin</th><th>Acción</th>
								</tr>
							</thead>
							<tbody>
								${runs.length === 0 ? html`<tr><td colspan="8" class="muted">No hay corridas registradas.</td></tr>` : runs.map(r => html`
									<tr>
										<td class="mono">#${r.id}</td>
										<td><strong>${r.type}</strong></td>
										<td>${r.isSimulation ? pill('Simulación', 'warn') : pill('Real', 'info')}</td>
										<td>${r.status === 'COMPLETED' ? pill('Completada', 'ok') : pill('Falló', 'bad')}</td>
										<td>${r.summary}</td>
										<td>${dateTime(r.startedAt)}</td>
										<td>${dateTime(r.finishedAt)}</td>
										<td><a href="/sincronizacion/${r.id}">Ver detalle</a></td>
									</tr>
								`)}
							</tbody>
						</table>
					</div>
				</section>
			`
			return page('Sincronización', '/sincronizacion', body)
		}

		// GET /sincronizacion/:id (§3.4)
		const runMatch = /^\/sincronizacion\/(\d+)$/.exec(path)
		if (req.method === 'GET' && runMatch) {
			const runId = Number(runMatch[1])
			const detail = await getRunDetailUseCase.execute(runId)
			if (!detail) {
				return sendHtml(res, 404, layout({ title: 'Corrida no encontrada', active: '/sincronizacion', company, body: html`<h1>Corrida no encontrada</h1><p><a href="/sincronizacion">Volver</a></p>` }))
			}

			const { run, items, counters } = detail

			const body = html`
				<div class="head">
					<div>
						<h1>Detalle de corrida #${run.id} ${run.isSimulation ? pill('Simulación', 'warn') : pill('Real', 'info')} ${run.status === 'COMPLETED' ? pill('Completada', 'ok') : pill('Falló', 'bad')}</h1>
						<p>Tipo: <strong>${run.type}</strong> · Iniciada el ${dateTime(run.startedAt)} · Finalizada el ${dateTime(run.finishedAt)}</p>
					</div>
					<div><a href="/sincronizacion" class="btn">Volver al historial</a></div>
				</div>

				<div class="tiles">
					${Object.entries(counters).map(([k, v]) => html`
						<div class="tile"><span>${k}</span><strong>${v}</strong></div>
					`)}
				</div>

				${run.errorMessage ? html`
					<div class="flash bad" role="alert">
						<strong>Error registrado:</strong> ${run.errorMessage}
					</div>
				` : ''}

				<section class="card">
					<header><h2>Resultado cuota por cuota (${items.length} evaluadas)</h2></header>
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th>Cuota</th><th>Contrato</th><th>Periodo</th><th class="num">Monto</th><th>Resultado</th><th>Motivo</th>
								</tr>
							</thead>
							<tbody>
								${items.length === 0 ? html`<tr><td colspan="6" class="muted">Sin cuotas detalladas en esta corrida.</td></tr>` : items.map(it => html`
									<tr>
										<td class="mono">${it.installmentId || '—'}</td>
										<td class="mono">${it.contractId || '—'}</td>
										<td>${it.period ? period(it.period) : '—'}</td>
										<td class="num">${it.amount !== null && it.amount !== undefined ? usd(it.amount * 100) : '—'}</td>
										<td>${pill(it.result, it.result === 'IMPORTED' || it.result === 'PAID' ? 'ok' : it.result === 'PARTIAL_PAYMENT' ? 'warn' : 'mute')}</td>
										<td class="muted">${it.reason || '—'}</td>
									</tr>
								`)}
							</tbody>
						</table>
					</div>
				</section>
			`
			return page(`Corrida #${run.id}`, '/sincronizacion', body)
		}

		// GET /configuracion (§3.1)
		if (req.method === 'GET' && path === '/configuracion') {
			const body = html`
				<div class="head">
					<div>
						<h1>Configuración</h1>
						<p>Parámetros de la empresa, credenciales del proveedor de facturación y reglas de importación.</p>
					</div>
				</div>

				<form method="POST" action="/configuracion" style="display:grid; gap:20px;">
					<section class="card">
						<header><h2>Datos de la empresa</h2></header>
						<div class="body grid2">
							<label class="field">
								<span>Nombre de la empresa</span>
								<input type="text" name="company_name" value="${config.companyName}" required>
							</label>
							<label class="field">
								<span>RIF / Cédula fiscal</span>
								<input type="text" name="company_tax_id" value="${config.companyTaxId}" required>
							</label>
							<label class="field">
								<span>Correo de cobranza</span>
								<input type="text" name="billing_email" value="${config.billingEmail}" required>
							</label>
						</div>
					</section>

					<section class="card">
						<header>
							<h2>Proveedor (Administrador de facturas del ISP)</h2>
							<form method="POST" action="/configuracion/probar" class="inline">
								<button type="submit" class="btn small">Probar conexión</button>
							</form>
						</header>
						<div class="body grid2">
							<label class="field">
								<span>URL de la API</span>
								<input type="url" name="api_url" value="${config.apiUrl}" required>
							</label>
							<label class="field">
								<span>Usuario API</span>
								<input type="text" name="api_user" value="${config.apiUser}" required>
							</label>
							<label class="field">
								<span>Contraseña API <small>(dejar vacío para mantener la actual)</small></span>
								<input type="password" name="api_password" placeholder="••••••••">
							</label>
						</div>
					</section>

					<section class="card">
						<header><h2>Reglas de importación</h2></header>
						<div class="body grid2">
							<label class="field">
								<span>Estados de contrato que se importan <small>(separados por coma)</small></span>
								<input type="text" name="importable_statuses" value="${config.importableStatuses.join(',')}" required>
							</label>
							<label class="field">
								<span>Días de gracia para fecha de corte</span>
								<input type="number" name="grace_days" value="${config.graceDays}" min="0" max="60" required>
							</label>
							<label class="field">
								<span>Ventana de importación en meses <small>(dejar vacío = sin ventana)</small></span>
								<input type="number" name="import_window_months" value="${config.importWindowMonths ?? ''}">
							</label>
							<label class="field">
								<span>Máx. cuotas recientes por contrato <small>(dejar vacío = todas)</small></span>
								<input type="number" name="max_recent_installments" value="${config.maxRecentInstallments ?? ''}">
							</label>
							<label class="field">
								<span>Tope máx. facturas nuevas por corrida</span>
								<input type="number" name="max_new_invoices" value="${config.maxNewInvoices ?? ''}">
							</label>
							<label class="field">
								<span>Tope máx. monto nuevo por corrida (USD)</span>
								<input type="number" step="0.01" name="max_new_amount" value="${config.maxNewAmount ?? ''}">
							</label>
							<label class="field">
								<span>Tipos de documento excluidos <small>(ej: J, G)</small></span>
								<input type="text" name="excluded_doc_types" value="${config.excludedDocTypes.join(',')}">
							</label>
						</div>
					</section>

					<section class="card">
						<header><h2>Corrida automática</h2></header>
						<div class="body grid2">
							<label class="field" style="grid-column: 1 / -1; display:flex; gap:10px; align-items:center;">
								<input type="checkbox" name="auto_run_enabled" value="1" ${config.autoRunEnabled ? 'checked' : ''}>
								<span>Activar corrida automática diaria (importar y luego actualizar pagadas)</span>
							</label>
							<label class="field">
								<span>Hora de ejecución (formato HH:MM, zona America/Caracas)</span>
								<input type="text" name="auto_run_hour" value="${config.autoRunHour ?? '03:00'}" placeholder="03:00">
							</label>
						</div>
					</section>

					<div>
						<button type="submit" class="btn primary">Guardar configuración</button>
					</div>
				</form>
			`
			return page('Configuración', '/configuracion', body)
		}

		// POST /configuracion/probar (§3.1)
		if (req.method === 'POST' && path === '/configuracion/probar') {
			try {
				const client = new BillingApiClient({
					baseUrl: config.apiUrl,
					username: config.apiUser,
					password: config.apiPassword,
				})
				const ids = await client.getContractIds()
				return redirect(res, '/configuracion', `Conexión exitosa con el proveedor. Se encontraron ${ids.length} contratos disponibles.`, 'ok')
			} catch (err) {
				return redirect(res, '/configuracion', `Error al conectar con la API: ${err instanceof Error ? err.message : String(err)}`, 'bad')
			}
		}

		// POST /configuracion (§3.1)
		if (req.method === 'POST' && path === '/configuracion') {
			const form = await parseBody(req)
			const companyName = form.get('company_name')?.trim() || config.companyName
			const companyTaxId = form.get('company_tax_id')?.trim() || config.companyTaxId
			const billingEmail = form.get('billing_email')?.trim() || config.billingEmail
			const apiUrl = form.get('api_url')?.trim() || config.apiUrl
			const apiUser = form.get('api_user')?.trim() || config.apiUser
			const newPassword = form.get('api_password')?.trim()
			const apiPassword = newPassword && newPassword.length > 0 ? newPassword : config.apiPassword

			const rawStatuses = form.get('importable_statuses')?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
			const importableStatuses = rawStatuses && rawStatuses.length > 0 ? rawStatuses : config.importableStatuses

			const graceDays = Number(form.get('grace_days') ?? config.graceDays)
			const windowMonths = form.get('import_window_months') ? Number(form.get('import_window_months')) : null
			const recentLimit = form.get('max_recent_installments') ? Number(form.get('max_recent_installments')) : null
			const maxInvoices = form.get('max_new_invoices') ? Number(form.get('max_new_invoices')) : null
			const maxAmount = form.get('max_new_amount') ? Number(form.get('max_new_amount')) : null
			const excludedDocs = form.get('excluded_doc_types')?.split(',').map(d => d.trim().toUpperCase()).filter(Boolean) ?? []
			const autoRunEnabled = form.get('auto_run_enabled') === '1'
			const autoRunHour = form.get('auto_run_hour')?.trim() || null

			await updateConfigUseCase.execute({
				companyName,
				companyTaxId,
				billingEmail,
				apiUrl,
				apiUser,
				apiPassword,
				importableStatuses,
				graceDays,
				importWindowMonths: windowMonths,
				maxRecentInstallments: recentLimit,
				maxNewInvoices: maxInvoices,
				maxNewAmount: maxAmount,
				excludedDocTypes: excludedDocs,
				autoRunEnabled,
				autoRunHour,
			})

			return redirect(res, '/configuracion', 'Configuración guardada exitosamente.', 'ok')
		}

		// POST /sincronizacion/importar (§3.2)
		if (req.method === 'POST' && path === '/sincronizacion/importar') {
			const isSim = url.searchParams.get('simular') === '1'
			const billingClient = new BillingApiClient({
				baseUrl: config.apiUrl,
				username: config.apiUser,
				password: config.apiPassword,
			})
			const importAdapter = new IspBillingApiAdapter(billingClient)
			const importRepo = new SqliteImportRepository(dbClient)

			try {
				const importUseCase = new ImportInstallmentsUseCase(importAdapter, importRepo, configRepo)
				if (isSim) {
					const simUseCase = new SimulateImportUseCase(importUseCase)
					const result = await simUseCase.execute()
					return redirect(res, '/sincronizacion', `Simulación de importación completada: se identificaron ${result.importedInvoicesCount} cuotas válidas para importar por un total de USD ${(result.importedAmount).toFixed(2)}.`, 'ok')
				} else {
					const result = await importUseCase.execute()
					return redirect(res, '/sincronizacion', `Importación completada: se crearon ${result.importedCustomersCount} clientes y ${result.importedInvoicesCount} facturas abiertas por USD ${(result.importedAmount).toFixed(2)}.`, 'ok')
				}
			} catch (err) {
				return redirect(res, '/sincronizacion', `Error durante la importación: ${err instanceof Error ? err.message : String(err)}`, 'bad')
			}
		}

		// POST /sincronizacion/pagadas (§3.3)
		if (req.method === 'POST' && path === '/sincronizacion/pagadas') {
			const isSim = url.searchParams.get('simular') === '1'
			const billingClient = new BillingApiClient({
				baseUrl: config.apiUrl,
				username: config.apiUser,
				password: config.apiPassword,
			})
			const paymentAdapter = new IspPaymentBillingApiAdapter(billingClient)
			const paymentRepo = new SqlitePaymentRepository(dbClient)

			try {
				const reconcileUseCase = new ReconcilePaymentsUseCase(paymentAdapter, paymentRepo)
				if (isSim) {
					const simUseCase = new SimulatePaymentsUseCase(reconcileUseCase)
					const result = await simUseCase.execute()
					return redirect(res, '/sincronizacion', `Simulación de pagos completada: ${result.paidInvoicesCount} facturas se marcarían pagadas.`, 'ok')
				} else {
					const result = await reconcileUseCase.execute()
					const stillOpen = result.totalInvoicesEvaluated - result.paidInvoicesCount
					return redirect(res, '/sincronizacion', `Conciliación completada: ${result.paidInvoicesCount} facturas marcadas pagadas, ${stillOpen} siguen abiertas.`, 'ok')
				}
			} catch (err) {
				return redirect(res, '/sincronizacion', `Error durante la conciliación de pagos: ${err instanceof Error ? err.message : String(err)}`, 'bad')
			}
		}

		// 404 Fallback
		return sendHtml(res, 404, layout({ title: 'No encontrado', active: '', company, body: html`<h1>Página no encontrada</h1><p><a href="/">Volver al resumen</a></p>` }))
	}

	const server = createServer((req, res) => {
		route(req, res).catch((error: unknown) => {
			console.error('[panel]', error)
			if (!res.headersSent) {
				sendHtml(res, 500, layout({ title: 'Error', active: '', company: 'Cobrix', body: html`<h1>Algo falló</h1><p class="muted">${esc(error instanceof Error ? error.message : error)}</p>` }))
			}
		})
	})

	server.on('close', () => {
		if (scheduler) {
			scheduler.stop()
		}
		if (dbClient) {
			dbClient.close()
		}
	})

	return server
}

const SKELETON_CSS = `
ul.todo, ol.todo { margin: 0; padding-left: 20px; display: grid; gap: 6px; max-width: 90ch; }
pre.doc { margin: 0; white-space: pre-wrap; font: 13.5px/1.6 var(--mono); color: var(--fg); max-width: 110ch; }
`

function redirect(res: ServerResponse, location: string, msg: string, tone: Tone): void {
	const sep = location.includes('?') ? '&' : '?'
	const dest = `${location}${sep}msg=${encodeURIComponent(msg)}&tone=${tone}`
	res.writeHead(303, { Location: dest })
	res.end()
}

function sendHtml(res: ServerResponse, status: number, body: string): void {
	send(res, status, body, 'text/html; charset=utf-8')
}

function send(res: ServerResponse, status: number, body: string, type: string): void {
	res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body) })
	res.end(body)
}
