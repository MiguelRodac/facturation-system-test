/**
 * Automated Tests for Cobrix Web Server & React SPA Serving
 */

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

describe('Web Server: React SPA & Static Assets Serving', () => {
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
			// Windows lock ignore
		}
	})

	it('GET / serves React SPA index.html', async () => {
		const res = await fetch(`${panelBaseUrl}/`)
		assert.equal(res.status, 200)
		assert.match(res.headers.get('content-type') || '', /text\/html/)
		const body = await res.text()
		assert.match(body, /<div id="root"><\/div>/)
		assert.match(body, /Cobrix/)
	})

	it('GET /configuracion serves React SPA for client routing', async () => {
		const res = await fetch(`${panelBaseUrl}/configuracion`)
		assert.equal(res.status, 200)
		assert.match(res.headers.get('content-type') || '', /text\/html/)
		const body = await res.text()
		assert.match(body, /<div id="root"><\/div>/)
	})

	it('GET /clientes serves React SPA for client routing', async () => {
		const res = await fetch(`${panelBaseUrl}/clientes`)
		assert.equal(res.status, 200)
		const body = await res.text()
		assert.match(body, /<div id="root"><\/div>/)
	})

	it('GET /sincronizacion serves React SPA for client routing', async () => {
		const res = await fetch(`${panelBaseUrl}/sincronizacion`)
		assert.equal(res.status, 200)
		const body = await res.text()
		assert.match(body, /<div id="root"><\/div>/)
	})

	it('GET /enunciado serves assignment markdown documentation', async () => {
		const res = await fetch(`${panelBaseUrl}/enunciado`)
		assert.equal(res.status, 200)
		const body = await res.text()
		assert.match(body, /Cobrix/)
	})
})
