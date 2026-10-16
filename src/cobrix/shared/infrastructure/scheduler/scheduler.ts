/**
 * Background Scheduler Service
 * Periodically verifies scheduled auto-sync and emits explicit console logs
 */

import type { DatabaseClient } from '../database/database.client.ts'

export interface SchedulerOptions {
	intervalMs?: number
}

export class BackgroundScheduler {
	private readonly db: DatabaseClient
	private timer: NodeJS.Timeout | null = null
	private readonly intervalMs: number

	constructor(db: DatabaseClient, options: SchedulerOptions = {}) {
		this.db = db
		this.intervalMs = options.intervalMs ?? 30_000 // 30 seconds default
	}

	start(): void {
		if (this.timer) return

		console.log(`[SYNC ENGINE] ⏰ Background scheduler iniciado (intervalo: ${this.intervalMs / 1000}s)`)
		this.check()

		this.timer = setInterval(() => {
			this.check()
		}, this.intervalMs)
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer)
			this.timer = null
			console.log(`[SYNC ENGINE] ⏹️ Background scheduler detenido`)
		}
	}

	private check(): void {
		try {
			const config = this.db.queryOne<{
				auto_run_enabled: number
				auto_run_hour: string | null
			}>('SELECT auto_run_enabled, auto_run_hour FROM company_config WHERE id = 1')

			if (!config) return

			const now = new Date()
			const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

			if (config.auto_run_enabled) {
				console.log(
					`[SYNC ENGINE] [${timeString}] 🔄 Verificación programada: Auto-run activo (Hora fijada: ${config.auto_run_hour || '03:00'}). Sistema listo para sincronización nocturna.`
				)
			} else {
				console.log(
					`[SYNC ENGINE] [${timeString}] ⏸️ Verificación programada: Auto-run en espera / manual. Sistema operativo para ejecución vía API o Panel.`
				)
			}
		} catch {
			// Database may not be initialized yet
		}
	}
}
