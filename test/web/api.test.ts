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

	it('GET /api/v1/customersol returns 404 RFC 9457 for unmapped API route', async () => {
		const res = await fetch(`${apiUrl}/api/v1/customersol`)
		assert.equal(res.status, 404)
		assert.equal(res.headers.get('content-type'), 'application/problem+json')
		const problem = await res.json() as { type: string; title: string; status: number; trace_id: string; instance: string }
		assert.equal(problem.status, 404)
		assert.equal(problem.title, 'Resource Not Found')
		assert.equal(problem.instance, '/api/v1/customersol')
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

	it('GET /api/v1/dashboard returns aggregated BFF summary', async () => {
		const res = await fetch(`${apiUrl}/api/v1/dashboard`)
		assert.equal(res.status, 200)
		const body = await res.json() as {
			data: {
				kpis: {
					total_customers: number
					total_contracts: number
					total_debt: number
					total_open_invoices: number
					total_paid_invoices: number
					last_run: unknown
				}
				provider: { company_name: string }
				top_debtors: Array<{ id: string; name: string }>
				recent_runs: Array<{ id: number; summary: string }>
			}
		}
		assert.ok(body.data)
		assert.ok(body.data.kpis.total_customers > 0)
		assert.ok(body.data.provider.company_name)
		assert.ok(Array.isArray(body.data.top_debtors))
		assert.ok(Array.isArray(body.data.recent_runs))
		assert.ok(body.data.recent_runs.length > 0)
	})

	it('POST /api/v1/sync/reset wipes synchronized database tables', async () => {
		const resetRes = await fetch(`${apiUrl}/api/v1/sync/reset`, { method: 'POST' })
		assert.equal(resetRes.status, 200)
		const resetBody = await resetRes.json() as { ok: boolean; data: { cleared: boolean; message: string } }
		assert.equal(resetBody.ok, true)
		assert.equal(resetBody.data.cleared, true)

		// Verify dashboard shows 0 customers and 0 open debt
		const dashRes = await fetch(`${apiUrl}/api/v1/dashboard`)
		const dashBody = await dashRes.json() as { data: { kpis: { total_customers: number; total_debt: number } } }
		assert.equal(dashBody.data.kpis.total_customers, 0)
		assert.equal(dashBody.data.kpis.total_debt, 0)
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

	it('returns 400 RFC 9457 Bad Request when client sends malformed JSON', async () => {
		const res = await fetch(`${apiUrl}/api/v1/config`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: '{ "invalid_json": ...',
		})
		assert.equal(res.status, 400)
		assert.equal(res.headers.get('content-type'), 'application/problem+json')
		const problem = await res.json() as { status: number; title: string; detail: string }
		assert.equal(problem.status, 400)
		assert.equal(problem.title, 'Bad Request')
		assert.match(problem.detail, /Malformed JSON payload/)
	})

	it('PUT /api/v1/config updates configuration with arbitrary string tax ID without 500', async () => {
		const payload = {
			company_name: 'Cobrix Telecom Demo',
			company_tax_id: 'string',
			billing_email: 'cobranzas@cobrix.local',
			api_url: billingApiUrl,
			api_user: 'cobrix',
			api_password: 'cobrix-sandbox',
			importable_statuses: ['ACTIVO', 'CORTADO'],
			import_window_months: 1156,
			max_recent_installments: 7896,
			grace_days: 7358,
			max_new_invoices: 3995,
			max_new_amount: 7183.089995745914,
			excluded_doc_types: ['string'],
			auto_run_hour: '03:00',
			auto_run_enabled: false,
		}
		const res = await fetch(`${apiUrl}/api/v1/config`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		})
		assert.equal(res.status, 200)
		const body = await res.json() as { data: { company_tax_id: string; grace_days: number } }
		assert.equal(body.data.company_tax_id, 'string')
		assert.equal(body.data.grace_days, 7358)
	})

	it('GET /app/ serves compiled React SPA index.html', async () => {
		const res = await fetch(`${apiUrl}/app/`)
		assert.equal(res.status, 200)
		assert.match(res.headers.get('content-type') || '', /text\/html/)
		const html = await res.text()
		assert.match(html, /<div id="root"><\/div>/)
		assert.match(html, /Cobrix/)
	})

	describe('API Key Security & RFC 9457 Unauthorized', () => {
		let securedPanel: ReturnType<typeof createApp>
		let securedUrl: string
		const SECURE_TOKEN = 'test-cobrix-secret-key-123'

		before(async () => {
			const cobrixDbPath = join(dir, 'cobrix.sqlite')
			securedPanel = createApp({
				simulatorUrl: billingApiUrl,
				assignmentPath: fileURLToPath(new URL('../../docs/ENUNCIADO.md', import.meta.url)),
				cobrixDbPath,
				apiKey: SECURE_TOKEN,
			})
			await new Promise<void>(resolve => securedPanel.listen(0, '127.0.0.1', resolve))
			const addr = securedPanel.address()
			const port = typeof addr === 'object' && addr ? addr.port : 0
			securedUrl = `http://127.0.0.1:${port}`
		})

		after(async () => {
			await new Promise(resolve => securedPanel.close(resolve))
		})

		it('rejects unauthenticated requests with 401 RFC 9457 Unauthorized', async () => {
			const res = await fetch(`${securedUrl}/api/v1/config`)
			assert.equal(res.status, 401)
			assert.equal(res.headers.get('content-type'), 'application/problem+json')
			const body = await res.json() as { status: number; title: string; type: string }
			assert.equal(body.status, 401)
			assert.equal(body.title, 'Unauthorized')
			assert.equal(body.type, 'https://cobrix.com/errors/unauthorized')
		})

		it('rejects invalid API token with 401 RFC 9457 Unauthorized', async () => {
			const res = await fetch(`${securedUrl}/api/v1/config`, {
				headers: { Authorization: 'Bearer wrong-token' },
			})
			assert.equal(res.status, 401)
			const body = await res.json() as { status: number; title: string }
			assert.equal(body.status, 401)
			assert.equal(body.title, 'Unauthorized')
		})

		it('accepts valid token via Authorization: Bearer <token>', async () => {
			const res = await fetch(`${securedUrl}/api/v1/config`, {
				headers: { Authorization: `Bearer ${SECURE_TOKEN}` },
			})
			assert.equal(res.status, 200)
			const body = await res.json() as { data: { company_name: string } }
			assert.ok(body.data.company_name)
		})

		it('accepts valid token via X-API-Key header', async () => {
			const res = await fetch(`${securedUrl}/api/v1/customers`, {
				headers: { 'X-API-Key': SECURE_TOKEN },
			})
			assert.equal(res.status, 200)
			const body = await res.json() as { data: unknown[] }
			assert.ok(Array.isArray(body.data))
		})

		it('allows public access to /api/v1/openapi.json and /docs without token', async () => {
			const openapiRes = await fetch(`${securedUrl}/api/v1/openapi.json`)
			assert.equal(openapiRes.status, 200)

			const docsRes = await fetch(`${securedUrl}/docs`)
			assert.equal(docsRes.status, 200)
		})
	})
})
