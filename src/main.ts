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
import { loadAndValidateEnv } from './cobrix/shared/infrastructure/config/env.config.ts'

const env = loadAndValidateEnv({ required: true })

const { DEFAULT_BILLING_API_DB, seedBillingApi } = await import('./billing-api/seed.ts')
const { createBillingApiServer } = await import('./billing-api/server.ts')
const { createApp, createApiServer, createFrontendServer } = await import('./web/app.ts')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const billingApiDb = resolve(root, env.BILLING_API_DB)
const apiPort = env.API_PORT
const frontendPort = env.FRONTEND_PORT
const billingApiPort = env.BILLING_API_PORT
const host = env.HOST

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
const cobrixDbPath = resolve(root, env.COBRIX_DB_PATH)
const assignmentPath = resolve(root, 'docs/ENUNCIADO.md')

let apiServer: ReturnType<typeof createApiServer> | null = null
let frontendServer: ReturnType<typeof createFrontendServer> | null = null
let unifiedApp: ReturnType<typeof createApp> | null = null

if (apiPort === frontendPort) {
	unifiedApp = createApp({
		simulatorUrl,
		assignmentPath,
		cobrixDbPath,
		apiKey: env.COBRIX_API_KEY,
	})
	unifiedApp.listen(apiPort, host)
} else {
	apiServer = createApiServer({
		cobrixDbPath,
		simulatorUrl,
		apiKey: env.COBRIX_API_KEY,
	})
	await new Promise<void>(resolve => apiServer!.listen(apiPort, host, resolve))

	frontendServer = createFrontendServer({
		assignmentPath,
		apiTargetUrl: `http://${host}:${apiPort}`,
	})
	await new Promise<void>(resolve => frontendServer!.listen(frontendPort, host, resolve))
}

console.log(`\n🚀 ==========================================`)
console.log(`   COBRIX BILLING SYSTEM OPERATIONAL`)
console.log(`   ==========================================`)
console.log(`   API REST Backend (Cobrix): http://${host}:${apiPort}/api/v1`)
console.log(`   Cobrix Swagger UI:         http://${host}:${apiPort}/docs`)
console.log(`   Cobrix OpenAPI 3.0:        http://${host}:${apiPort}/api/v1/openapi.json`)
console.log(`   Panel Web (React SPA):     http://${host}:${frontendPort}`)
console.log(`   API del Administrador ISP: http://${host}:${billingApiPort}/api/v1`)
console.log(`   Swagger del ISP:           http://${host}:${billingApiPort}/docs`)
console.log(`   Token de Seguridad (API):  ${env.COBRIX_API_KEY}`)
console.log(`   Fecha de la prueba:        ${env.SANDBOX_TODAY}`)
console.log(`   ==========================================\n`)

const shutdown = (): void => {
	unifiedApp?.close()
	apiServer?.close()
	frontendServer?.close()
	void billingApi.close().then(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

