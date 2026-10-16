/**
 * Starts the test environment in one process:
 *   - the invoice manager API over data/billing-api.sqlite  (BILLING_API_PORT, default 4310)
 *   - the panel skeleton                                     (PORT, default 4300)
 *
 * The provided database was generated for 2026-10-13. That date is pinned by default so
 * the acceptance numbers in docs/ENUNCIADO.md hold; set SANDBOX_TODAY to change it.
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.SANDBOX_TODAY ??= '2026-10-13'

const { DEFAULT_BILLING_API_DB, seedBillingApi } = await import('./billing-api/seed.ts')
const { createBillingApiServer } = await import('./billing-api/server.ts')
const { createApp } = await import('./web/app.ts')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const billingApiDb = process.env.BILLING_API_DB ?? DEFAULT_BILLING_API_DB
const appPort = Number(process.env.PORT ?? 4300)
const billingApiPort = Number(process.env.BILLING_API_PORT ?? 4310)
const host = process.env.HOST ?? '127.0.0.1'

if (!existsSync(billingApiDb)) seedBillingApi(billingApiDb)

const distWebIndex = resolve(root, 'dist/web/index.html')
if (!existsSync(distWebIndex)) {
	console.log('⚡ Compilando frontend React SPA...')
	const { execSync } = await import('node:child_process')
	execSync('pnpm run frontend:build', { cwd: root, stdio: 'inherit' })
}

const billingApi = createBillingApiServer(billingApiDb)
await billingApi.listen(billingApiPort, host)
const simulatorUrl = `http://${host}:${billingApiPort}`
const cobrixDbPath = resolve(root, 'data/cobrix.sqlite')
const app = createApp({
	simulatorUrl,
	assignmentPath: resolve(root, 'docs/ENUNCIADO.md'),
	cobrixDbPath,
})
app.listen(appPort, host)

console.log(`\n🚀 ==========================================`)
console.log(`   COBRIX BILLING SYSTEM OPERATIONAL`)
console.log(`   ==========================================`)
console.log(`   Panel Web (React SPA):    http://${host}:${appPort}`)
console.log(`   Cobrix Swagger UI:        http://${host}:${appPort}/docs`)
console.log(`   Cobrix OpenAPI 3.0:       http://${host}:${appPort}/api/v1/openapi.json`)
console.log(`   API del Administrador ISP: http://${host}:${billingApiPort}/api/v1`)
console.log(`   Swagger del ISP:          http://${host}:${billingApiPort}/docs`)
console.log(`   Fecha de la prueba:       ${process.env.SANDBOX_TODAY}`)
console.log(`   ==========================================\n`)

const shutdown = (): void => {
	app.close()
	void billingApi.close().then(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
