/**
 * Value Object: Period
 *
 * Business Rules (docs/ENUNCIADO.md §3.1 & §4):
 * - Period and due date (vencimiento) are extracted from detalle_deuda
 *   ("PLAN - 2026 Agosto" -> period 2026-08, due date 2026-08-01).
 * - Cutoff date (corte) is the due date plus grace days (0 to 60 days).
 * - Import window: only installments from current month minus N months
 *   (3, 6, 9, 12, or null = no window).
 */

import { addCivilDays, addMonths } from '../dates.ts'

const SPANISH_MONTH_MAP: Record<string, string> = {
	enero: '01',
	febrero: '02',
	marzo: '03',
	abril: '04',
	mayo: '05',
	junio: '06',
	julio: '07',
	agosto: '08',
	septiembre: '09',
	octubre: '10',
	noviembre: '11',
	diciembre: '12',
}

const DEBT_DETAIL_REGEX = /(\d{4})\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)/i
const PERIOD_REGEX = /^(\d{4})-(\d{2})$/

export class Period {
	readonly value: string // YYYY-MM
	readonly dueDate: string // YYYY-MM-01

	private constructor(periodString: string) {
		this.value = periodString
		this.dueDate = `${periodString}-01`
	}

	static fromPeriod(periodString: string): Period {
		if (!PERIOD_REGEX.test(periodString)) {
			throw new Error(`Invalid period format: "${periodString}". Expected YYYY-MM.`)
		}
		return new Period(periodString)
	}

	/**
	 * Parses period from ISP debt detail string (e.g. "PLAN15MB25 - 2026 Agosto" -> 2026-08).
	 */
	static fromDebtDetail(detail: string): Period {
		if (typeof detail !== 'string') {
			throw new Error('Invalid period: debt detail must be a string.')
		}

		const match = detail.match(DEBT_DETAIL_REGEX)
		if (!match) {
			throw new Error(`Invalid period: unable to extract period from "${detail}".`)
		}

		const year = match[1]!
		const monthName = match[2]!.toLowerCase()
		const monthNum = SPANISH_MONTH_MAP[monthName]

		if (!monthNum) {
			throw new Error(`Invalid period: unknown month name "${match[2]}" in "${detail}".`)
		}

		return new Period(`${year}-${monthNum}`)
	}

	/**
	 * Cutoff date is due date plus grace days.
	 * docs/ENUNCIADO.md §4: "El corte es el vencimiento más los días de gracia."
	 */
	calculateCutoffDate(graceDays: number): string {
		const safeDays = Math.max(0, Math.round(graceDays))
		return addCivilDays(this.dueDate, safeDays)
	}

	/**
	 * Checks if this period falls within the configured window.
	 * docs/ENUNCIADO.md §3.1: "solo cuotas desde el mes actual menos N meses (3, 6, 9 o 12; o sin ventana)."
	 */
	isWithinWindow(currentPeriod: string, windowMonths: number | null | undefined): boolean {
		if (windowMonths === null || windowMonths === undefined || windowMonths <= 0) {
			return true
		}
		const oldestValidPeriod = addMonths(currentPeriod, -windowMonths)
		return this.value >= oldestValidPeriod
	}

	compareTo(other: Period): number {
		return this.value.localeCompare(other.value)
	}

	isBefore(other: Period): boolean {
		return this.compareTo(other) < 0
	}

	isAfter(other: Period): boolean {
		return this.compareTo(other) > 0
	}

	equals(other: Period): boolean {
		return this.value === other.value
	}

	toString(): string {
		return this.value
	}
}
