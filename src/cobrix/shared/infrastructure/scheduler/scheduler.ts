/**
 * Background Scheduler Service (docs/ENUNCIADO.md §3.1)
 *
 * Checks scheduled auto-run daily at the user-configured hour.
 * Operates quietly and logs start, stop, triggers, and any execution errors.
 */

export interface ScheduleConfig {
	readonly autoRunEnabled: boolean
	readonly autoRunHour: string | null
}

export interface SchedulerOptions {
	readonly intervalMs?: number
	readonly onTrigger?: () => Promise<void>
	readonly getConfig: () => Promise<ScheduleConfig | null>
}

export class BackgroundScheduler {
	private timer: NodeJS.Timeout | null = null
	private readonly intervalMs: number
	private readonly onTrigger?: () => Promise<void>
	private readonly getConfig: () => Promise<ScheduleConfig | null>
	private lastRunDate: string | null = null

	constructor(options: SchedulerOptions) {
		this.intervalMs = options.intervalMs ?? 60_000
		this.onTrigger = options.onTrigger
		this.getConfig = options.getConfig
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
			const config = await this.getConfig()

			if (!config || !config.autoRunEnabled || !config.autoRunHour) {
				return
			}

			const now = new Date()
			const currentHourMinute = new Intl.DateTimeFormat('en-GB', {
				timeZone: 'America/Caracas',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
			}).format(now)
			const todayDate = new Intl.DateTimeFormat('en-CA', {
				timeZone: 'America/Caracas',
			}).format(now)

			if (config.autoRunHour === currentHourMinute && this.lastRunDate !== todayDate) {
				this.lastRunDate = todayDate
				console.log(`[SYNC ENGINE] 🚀 [${currentHourMinute}] Ejecutando corrida programada diaria (${config.autoRunHour})...`)

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
