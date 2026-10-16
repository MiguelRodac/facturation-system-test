/**
 * Background Scheduler Service (docs/ENUNCIADO.md §3.1)
 *
 * Checks scheduled auto-run daily at the user-configured hour.
 * Operates quietly and logs start, stop, triggers, and any execution errors.
 */

import type { DatabaseClient } from '../database/database.client.ts'

export interface SchedulerOptions {
	intervalMs?: number
	onTrigger?: () => Promise<void>
}

export class BackgroundScheduler {
	private readonly db: DatabaseClient
	private timer: NodeJS.Timeout | null = null
	private readonly intervalMs: number
	private readonly onTrigger?: () => Promise<void>
	private lastRunDate: string | null = null

	constructor(db: DatabaseClient, options: SchedulerOptions = {}) {
		this.db = db
		this.intervalMs = options.intervalMs ?? 60_000 // 1 minute default
		this.onTrigger = options.onTrigger
	}

	start(): void {
		if (this.timer) return

		console.log(`[SYNC ENGINE] ⏰ Background scheduler iniciado (verificación silenciosa cada ${Math.round(this.intervalMs / 1000)}s)`)
		void this.check()

		this.timer = setInterval(() => {
			void this.check()
		}, this.intervalMs)
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer)
			this.timer = null
			console.log(`[SYNC ENGINE] ⏹️ Background scheduler detenido`)
		}
	}

	private async check(): Promise<void> {
		try {
			const config = this.db.queryOne<{
				auto_run_enabled: number
				auto_run_hour: string | null
			}>('SELECT auto_run_enabled, auto_run_hour FROM company_config WHERE id = 1')

			if (!config || !config.auto_run_enabled || !config.auto_run_hour) {
				return
			}

			const now = new Date()
			const currentHourMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
			const todayDate = now.toISOString().split('T')[0] ?? ''

			if (config.auto_run_hour === currentHourMinute && this.lastRunDate !== todayDate) {
				this.lastRunDate = todayDate
				console.log(`[SYNC ENGINE] 🚀 [${currentHourMinute}] Ejecutando corrida programada diaria (${config.auto_run_hour})...`)

				if (this.onTrigger) {
					try {
						await this.onTrigger()
						console.log(`[SYNC ENGINE] ✅ [${currentHourMinute}] Corrida programada finalizada con éxito.`)
					} catch (triggerError) {
						console.error(`[SYNC ENGINE] ❌ [${currentHourMinute}] Error ejecutando corrida programada:`, triggerError)
					}
				}
			}
		} catch (error) {
			console.error('[SYNC ENGINE] ❌ Error en verificación programada del scheduler:', error)
		}
	}
}
