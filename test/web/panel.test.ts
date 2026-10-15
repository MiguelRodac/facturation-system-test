import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { seedBillingApi } from '../../src/billing-api/seed.ts'
import { createBillingApiServer, type BillingApiServer } from '../../src/billing-api/server.ts'
import { createCobrixDatabase } from '../../src/cobrix/shared/infrastructure/database/database.ts'
import { SqliteDatabaseClient } from '../../src/cobrix/shared/infrastructure/database/database.client.ts'
import { createApp } from '../../src/web/app.ts'

process.env.SANDBOX_TODAY = '2026-10-13'

describe('Web Panel: Operational Dashboard & Endpoints (docs/ENUNCIADO.md §3)', () => {
	let tempDir: string
	let apiServer: BillingApiServer
	let apiBaseUrl: string
	let panelServer: ReturnType<typeof createApp>
	let panelBaseUrl: string
	let cobrixDbPath: string

	before(async () => {
		tempDir = mkdtempSync(join(tmpdir(), 'cobrix-panel-test-'))
		const ispDbPath = join(tempDir, 'billing-api.sqlite')
		seedBillingApi(ispDbPath)
		apiServer = createBillingApiServer(ispDbPath)
		const apiPort = await apiServer.listen(0, '127.0.0.1')
		apiBaseUrl = `http://127.0.0.1:${apiPort}`

		cobrixDbPath = join(tempDir, 'cobrix.sqlite')
		const instance = createCobrixDatabase(cobrixDbPath)
		// Update configuration to point to local test ISP API
		const dbClient = new SqliteDatabaseClient(instance.db)
		dbClient.execute('UPDATE company_config SET api_url = ? WHERE id = 1', [apiBaseUrl])
		instance.close()

		panelServer = createApp({
			simulatorUrl: apiBaseUrl,
			assignmentPath: fileURLToPath(new URL('../../docs/ENUNCIADO.md', import.meta.url)),
			cobrixDbPath,
		})
		await new Promise<void>(resolve => panelServer.listen(0, '127.0.0.1', resolve))
		const address = panelServer.address()
		const panelPort = typeof address === 'object' && address ? address.port : 0
		panelBaseUrl = `http://127.0.0.1:${panelPort}`
	})

	after(async () => {
		await new Promise(resolve => panelServer.close(resolve))
		await apiServer.close()
		try {
			rmSync(tempDir, { recursive: true, force: true })
		} catch {
			// Ignore Windows temp lock
		}
	})

	it('GET / renders dashboard summary with statistics and provider details', async () => {
		const res = await fetch(`${panelBaseUrl}/`)
		assert.equal(res.status, 200)
		const body = await res.text()
		assert.match(body, /Resumen/)
		assert.match(body, /Clientes importados/)
		assert.match(body, /Monto por cobrar/)
		assert.match(body, /Proveedor configurado/)
	})

	it('GET /configuracion renders configuration form and parameters', async () => {
		const res = await fetch(`${panelBaseUrl}/configuracion`)
		assert.equal(res.status, 200)
		const body = await res.text()
		assert.match(body, /Configuración/)
		assert.match(body, /Cobrix Telecom Demo/)
		assert.match(body, /Probar conexión/)
	})

	it('POST /configuracion/probar tests connection to ISP billing API', async () => {
		const res = await fetch(`${panelBaseUrl}/configuracion/probar`, {
			method: 'POST',
			redirect: 'manual',
		})
		assert.equal(res.status, 303)
		const location = res.headers.get('location') ?? ''
		assert.match(location, /tone=ok/)
		assert.match(location, /27/)
	})

	it('POST /sincronizacion/importar?simular=1 executes import simulation', async () => {
		const res = await fetch(`${panelBaseUrl}/sincronizacion/importar?simular=1`, {
			method: 'POST',
			redirect: 'manual',
		})
		assert.equal(res.status, 303)
		const location = res.headers.get('location') ?? ''
		assert.match(location, /tone=ok/)
		assert.match(location, /42/)
	})

	it('POST /sincronizacion/importar executes real import of 20 customers and 42 invoices', async () => {
		const res = await fetch(`${panelBaseUrl}/sincronizacion/importar`, {
			method: 'POST',
			redirect: 'manual',
		})
		assert.equal(res.status, 303)
		const location = res.headers.get('location') ?? ''
		assert.match(location, /tone=ok/)

		// Check customers table now shows 20 customers
		const clientRes = await fetch(`${panelBaseUrl}/clientes`)
		assert.equal(clientRes.status, 200)
		const clientBody = await clientRes.text()
		assert.match(clientBody, /Ana P[eé]rez/i)
		assert.match(clientBody, /Luis G[oó]mez/i)
		assert.match(clientBody, /9000123/) // Elena Ruiz normalized ID
	})

	it('GET /clientes?q=... filters customer list by query', async () => {
		const res = await fetch(`${panelBaseUrl}/clientes?q=Faro`)
		assert.equal(res.status, 200)
		const body = await res.text()
		assert.match(body, /Comercial El Faro/i)
		assert.doesNotMatch(body, /Ana P[eé]rez/i)
	})

	it('GET /clientes/:id renders customer dossier with profile, contracts and invoices', async () => {
		const res = await fetch(`${panelBaseUrl}/clientes/V12345678`)
		assert.equal(res.status, 200)
		const body = await res.text()
		assert.match(body, /Ana P[eé]rez/i)
		assert.match(body, /Expediente/)
		assert.match(body, /Contratos en el administrador/)
		assert.match(body, /Facturas/)
		assert.match(body, /Línea de tiempo/)
	})

	it('POST /sincronizacion/pagadas reconciles payments after cash desk simulator payments', async () => {
		// 1. Simulate payments in ISP cash desk
		await fetch(`${apiBaseUrl}/__sim/pagar`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ contrato_id: 900101, monto: 75.00 }), // Ana Perez full debt
		})

		// 2. Reconcile in panel
		const res = await fetch(`${panelBaseUrl}/sincronizacion/pagadas`, {
			method: 'POST',
			redirect: 'manual',
		})
		assert.equal(res.status, 303)
		const location = res.headers.get('location') ?? ''
		assert.match(location, /tone=ok/)

		// 3. Verify sync runs list
		const syncRes = await fetch(`${panelBaseUrl}/sincronizacion`)
		assert.equal(syncRes.status, 200)
		const syncBody = await syncRes.text()
		assert.match(syncBody, /UPDATE_PAID/)
		assert.match(syncBody, /IMPORT/)
	})

	it('GET /sincronizacion/:id renders sync run detail and cuota breakdown', async () => {
		const res = await fetch(`${panelBaseUrl}/sincronizacion/1`)
		assert.equal(res.status, 200)
		const body = await res.text()
		assert.match(body, /Detalle de corrida/)
		assert.match(body, /Cuota/)
	})

	it('POST /configuracion updates company and provider configuration', async () => {
		const form = new URLSearchParams({
			company_name: 'Cobrix Telecom Venezuela',
			company_tax_id: 'J-99999999-0',
			billing_email: 'pagos@cobrix.ve',
			api_url: apiBaseUrl,
			api_user: 'cobrix',
			api_password: '', // Leave unchanged
			importable_statuses: 'ACTIVO,CORTADO',
			grace_days: '5',
			auto_run_hour: '03:00',
			auto_run_enabled: '1',
		})

		const res = await fetch(`${panelBaseUrl}/configuracion`, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: form.toString(),
			redirect: 'manual',
		})
		assert.equal(res.status, 303)

		// Verify changed configuration
		const cfgRes = await fetch(`${panelBaseUrl}/configuracion`)
		const cfgBody = await cfgRes.text()
		assert.match(cfgBody, /Cobrix Telecom Venezuela/)
		assert.match(cfgBody, /J-99999999-0/)
	})
})
