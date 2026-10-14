import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

import { seedBillingApi } from '../../src/billing-api/seed.ts'
import { createBillingApiServer, type BillingApiServer } from '../../src/billing-api/server.ts'
import { BillingApiClient } from '../../src/cobrix/shared/infrastructure/billing-api.client.ts'

process.env.SANDBOX_TODAY = '2026-10-13'

describe('Infrastructure: BillingApiClient (HTTP Client docs/API.md §3)', () => {
	let tempDir: string
	let apiServer: BillingApiServer
	let baseUrl: string
	let client: BillingApiClient

	before(async () => {
		tempDir = mkdtempSync(join(tmpdir(), 'billing-api-client-test-'))
		const dbPath = join(tempDir, 'billing-api.sqlite')
		seedBillingApi(dbPath)
		apiServer = createBillingApiServer(dbPath)
		const port = await apiServer.listen(0, '127.0.0.1')
		baseUrl = `http://127.0.0.1:${port}`

		client = new BillingApiClient({
			baseUrl,
			username: 'cobrix',
			password: 'cobrix-sandbox',
		})
	})

	after(async () => {
		await apiServer.close()
		rmSync(tempDir, { recursive: true, force: true })
	})

	it('tests connection, logs in and returns all 27 contract IDs without filtering active only (§3.1 & §3.2)', async () => {
		const summary = await client.testConnection()
		assert.equal(summary.totalContracts, 27)
		assert.equal(summary.contractIds.length, 27)
		assert.ok(summary.contractIds.includes(900101))
	})

	it('reuses cached token without performing redundant login calls', async () => {
		const token1 = await client.getToken()
		const token2 = await client.getToken()
		assert.equal(token1, token2)
	})

	it('fetches pending installments of an individual contract (Ana Perez 900101, §3.3)', async () => {
		const rows = await client.getContractInstallments(900101)
		assert.equal(rows.length, 3)
		assert.equal(rows[0]!.contrato_id, 900101)
		assert.equal(rows[0]!.nombre_contrato, 'ANA PEREZ')
	})

	it('fetches payment information ignoring success:false quirk (§3.4)', async () => {
		const payments = await client.getPaymentInformation(900101, '2026-03-01', '2026-10-31')
		assert.ok(Array.isArray(payments))
		assert.ok(payments.length > 0)
		assert.ok(payments[0]!.detalle_pago)
	})

	it('throws descriptive error on invalid credentials', async () => {
		const badClient = new BillingApiClient({
			baseUrl,
			username: 'cobrix',
			password: 'wrong-password',
		})

		await assert.rejects(
			async () => badClient.testConnection(),
			/contraseña incorrecta|error de autenticación/i,
		)
	})
})
