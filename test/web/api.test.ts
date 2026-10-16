/**
 * Automated Tests for Cobrix REST API Endpoints (/api/v1/*, RFC 9457, Swagger UI)
 */

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { createBillingApiServer, type BillingApiServer } from '../../src/billing-api/server.ts'
import { seedBillingApi } from '../../src/billing-api/seed.ts'
import { createApp } from '../../src/web/app.ts'

process.env.SANDBOX_TODAY = '2026-10-13'

describe('Cobrix REST API Endpoints (/api/v1/* & RFC 9457)', () => {
	let dir: string
	let billingApi: BillingApiServer
	let billingApiUrl: string
	let panel: ReturnType<typeof createApp>
	let apiUrl: string

	before(async () => {
		dir = mkdtempSync(join(tmpdir(), 'cobrix-api-test-'))
		const billingDb = join(dir, 'billing-api.sqlite')
		seedBillingApi(billingDb)
		billingApi = createBillingApiServer(billingDb)
		const bPort = await billingApi.listen(0)
		billingApiUrl = `http://127.0.0.1:${bPort}`

		const cobrixDbPath = join(dir, 'cobrix.sqlite')
		const instance = (await import('../../src/cobrix/shared/infrastructure/database/database.ts')).createCobrixDatabase(cobrixDbPath)
		const { SqliteDatabaseClient } = await import('../../src/cobrix/shared/infrastructure/database/database.client.ts')
		const dbClient = new SqliteDatabaseClient(instance.db)
		dbClient.execute('UPDATE company_config SET api_url = ? WHERE id = 1', [billingApiUrl])
		instance.close()

		panel = createApp({
			simulatorUrl: billingApiUrl,
			assignmentPath: fileURLToPath(new URL('../../docs/ENUNCIADO.md', import.meta.url)),
			cobrixDbPath,
		})

		await new Promise<void>(resolve => panel.listen(0, '127.0.0.1', resolve))
		const address = panel.address()
		const panelPort = typeof address === 'object' && address ? address.port : 0
		apiUrl = `http://127.0.0.1:${panelPort}`
	})

	after(async () => {
		await new Promise(resolve => panel.close(resolve))
		await billingApi.close()
		try {
			rmSync(dir, { recursive: true, force: true })
		} catch {
			// Ignore Windows temporary file lock
		}
	})

	it('GET /api/v1/openapi.json returns OpenAPI 3.0 specification', async () => {
		const res = await fetch(`${apiUrl}/api/v1/openapi.json`)
		assert.equal(res.status, 200)
		const spec = await res.json() as { openapi: string; paths: Record<string, unknown> }
		assert.match(spec.openapi, /^3\./)
		assert.ok(spec.paths['/api/v1/customers'])
		assert.ok(spec.paths['/api/v1/sync/import'])
	})

	it('GET /docs returns Swagger UI interactive page', async () => {
		const res = await fetch(`${apiUrl}/docs`)
		assert.equal(res.status, 200)
		const html = await res.text()
		assert.match(html, /SwaggerUIBundle/)
	})

	it('GET /api/v1/config returns company configuration', async () => {
		const res = await fetch(`${apiUrl}/api/v1/config`)
		assert.equal(res.status, 200)
		const body = await res.json() as { data: { company_name: string; importable_statuses: string[] } }
		assert.ok(body.data)
		assert.equal(typeof body.data.company_name, 'string')
		assert.ok(Array.isArray(body.data.importable_statuses))
	})

	it('POST /api/v1/config/test-connection tests live ISP connection', async () => {
		const res = await fetch(`${apiUrl}/api/v1/config/test-connection`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				api_url: billingApiUrl,
				api_user: 'cobrix',
				api_password: 'cobrix-sandbox',
			}),
		})
		assert.equal(res.status, 200)
		const result = await res.json() as { ok: boolean; message: string }
		assert.equal(result.ok, true)
	})

	it('POST /api/v1/sync/import?simulate=true runs import simulation', async () => {
		const res = await fetch(`${apiUrl}/api/v1/sync/import?simulate=true`, {
			method: 'POST',
		})
		assert.equal(res.status, 200)
		const body = await res.json() as { data: { is_simulation: boolean; imported_invoices_count: number } }
		assert.equal(body.data.is_simulation, true)
		assert.equal(body.data.imported_invoices_count, 42)
	})

	it('POST /api/v1/sync/import?simulate=false imports 20 customers and 42 invoices', async () => {
		const res = await fetch(`${apiUrl}/api/v1/sync/import?simulate=false`, {
			method: 'POST',
		})
		assert.equal(res.status, 200)
		const body = await res.json() as { data: { is_simulation: boolean; imported_customers_count: number; imported_invoices_count: number } }
		assert.equal(body.data.is_simulation, false)
		assert.equal(body.data.imported_customers_count, 20)
		assert.equal(body.data.imported_invoices_count, 42)
	})

	it('GET /api/v1/customers returns imported customers list', async () => {
		const res = await fetch(`${apiUrl}/api/v1/customers`)
		assert.equal(res.status, 200)
		const body = await res.json() as { data: Array<{ id: string; name: string; total_debt: number }> }
		assert.equal(body.data.length, 20)
	})

	it('GET /api/v1/customers/:id returns complete customer dossier', async () => {
		const res = await fetch(`${apiUrl}/api/v1/customers/V12345678`)
		assert.equal(res.status, 200)
		const body = await res.json() as { data: { profile: { name: string }; contracts: unknown[]; invoices: unknown[]; totals: { total_debt: number } } }
		assert.equal(body.data.profile.name, 'ANA PEREZ')
		assert.equal(body.data.contracts.length, 1)
		assert.equal(body.data.invoices.length, 3)
	})

	it('GET /api/v1/customers/:id returns 404 RFC 9457 for non-existent customer', async () => {
		const res = await fetch(`${apiUrl}/api/v1/customers/UNKNOWN999`)
		assert.equal(res.status, 404)
		assert.equal(res.headers.get('content-type'), 'application/problem+json')
		const problem = await res.json() as { type: string; title: string; status: number; trace_id: string }
		assert.equal(problem.status, 404)
		assert.equal(problem.title, 'Resource Not Found')
		assert.ok(problem.trace_id)
	})

	it('POST /api/v1/sync/reconcile reconciles payments', async () => {
		// Register payments in ISP cash desk simulator (§5)
		await fetch(`${billingApiUrl}/__sim/pagar`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id_contrato: 900101 }),
		})
		await fetch(`${billingApiUrl}/__sim/pagar`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id_contrato: 900103, monto: 25 }),
		})
		await fetch(`${billingApiUrl}/__sim/pagar`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id_contrato: 900104 }),
		})
		await fetch(`${billingApiUrl}/__sim/pagar`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id_contrato: 900114, monto: 70 }),
		})
		const elenaPayRes = await fetch(`${billingApiUrl}/__sim/pagar`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id_contrato: 900113 }),
		})
		const elenaPay = await elenaPayRes.json() as { id_factura: number }
		await fetch(`${billingApiUrl}/__sim/anular`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ id_factura: elenaPay.id_factura }),
		})

		const res = await fetch(`${apiUrl}/api/v1/sync/reconcile?simulate=false`, {
			method: 'POST',
		})
		assert.equal(res.status, 200)
		const body = await res.json() as { data: { paid_invoices_count: number; partial_payments_count: number } }
		assert.equal(body.data.paid_invoices_count, 8)
		assert.equal(body.data.partial_payments_count, 1)
	})

	it('GET /api/v1/sync/runs returns recorded runs', async () => {
		const res = await fetch(`${apiUrl}/api/v1/sync/runs`)
		assert.equal(res.status, 200)
		const body = await res.json() as { data: Array<{ id: number; type: string; status: string }> }
		assert.ok(body.data.length >= 2)
	})

	it('PUT /api/v1/config returns 422 RFC 9457 ValidationError for invalid payload', async () => {
		const res = await fetch(`${apiUrl}/api/v1/config`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				auto_run_hour: 'invalid-hour',
				grace_days: -10,
			}),
		})
		assert.equal(res.status, 422)
		assert.equal(res.headers.get('content-type'), 'application/problem+json')
		const problem = await res.json() as { status: number; title: string; errors: Array<{ field: string; message: string }> }
		assert.equal(problem.status, 422)
		assert.equal(problem.title, 'Validation Error')
		assert.ok(problem.errors.some(e => e.field.includes('auto_run_hour')))
	})

	it('GET /app/ serves compiled React SPA index.html', async () => {
		const res = await fetch(`${apiUrl}/app/`)
		assert.equal(res.status, 200)
		assert.match(res.headers.get('content-type') || '', /text\/html/)
		const html = await res.text()
		assert.match(html, /<div id="root"><\/div>/)
		assert.match(html, /Cobrix/)
	})
})
