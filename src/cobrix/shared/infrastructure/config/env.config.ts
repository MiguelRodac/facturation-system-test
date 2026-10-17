/**
 * Strict Environment Configuration & Validation
 * Enforces fail-fast startup when .env is missing or invalid
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../')

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	HOST: z.string().default('127.0.0.1'),
	API_PORT: z.coerce.number().default(4300),
	FRONTEND_PORT: z.coerce.number().default(3000),
	BILLING_API_PORT: z.coerce.number().default(4310),
	BILLING_API_DB: z.string().default('data/billing-api.sqlite'),
	COBRIX_DB_PATH: z.string().default('data/cobrix.sqlite'),
	SANDBOX_TODAY: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'SANDBOX_TODAY must be in YYYY-MM-DD format').default('2026-10-13'),
	COBRIX_API_KEY: z.string().min(8, 'COBRIX_API_KEY must have at least 8 characters'),
	VITE_API_KEY: z.string().min(8).optional(),
})

export type AppEnvironment = z.infer<typeof envSchema>

export function loadAndValidateEnv(options: { required?: boolean } = {}): AppEnvironment {
	const isRequired = options.required ?? true
	const envPath = resolve(rootDir, '.env')

	if (!existsSync(envPath)) {
		if (isRequired) {
			console.error('\n❌ ==============================================================================')
			console.error('   FATAL: Archivo .env no encontrado en la raíz del proyecto.')
			console.error('   Por favor copie el archivo .env.example a .env antes de iniciar la aplicación:')
			console.error('       cp .env.example .env')
			console.error('   ==============================================================================\n')
			process.exit(1)
		}
	} else {
		try {
			process.loadEnvFile(envPath)
		} catch (err) {
			console.error(`⚠️ Error al cargar archivo .env (${envPath}):`, err)
		}
	}

	const rawApiPort = process.env.API_PORT ?? process.env.PORT
	const parseResult = envSchema.safeParse({
		NODE_ENV: process.env.NODE_ENV,
		HOST: process.env.HOST,
		API_PORT: rawApiPort,
		FRONTEND_PORT: process.env.FRONTEND_PORT,
		BILLING_API_PORT: process.env.BILLING_API_PORT,
		BILLING_API_DB: process.env.BILLING_API_DB,
		COBRIX_DB_PATH: process.env.COBRIX_DB_PATH,
		SANDBOX_TODAY: process.env.SANDBOX_TODAY,
		COBRIX_API_KEY: process.env.COBRIX_API_KEY,
		VITE_API_KEY: process.env.VITE_API_KEY,
	})

	if (!parseResult.success) {
		console.error('\n❌ ==============================================================================')
		console.error('   FATAL: Variables de entorno requeridas faltantes o inválidas:')
		for (const issue of parseResult.error.issues) {
			console.error(`   - ${issue.path.join('.')}: ${issue.message}`)
		}
		console.error('   Consulte .env.example para ver los valores requeridos.')
		console.error('   ==============================================================================\n')
		process.exit(1)
	}

	return parseResult.data
}
