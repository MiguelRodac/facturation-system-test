/**
 * Import Window Filter (docs/ENUNCIADO.md §3.1 line 45)
 *
 * Checks if an installment's period falls within the configured sliding month window.
 */

import type { Period } from '../../../../shared/domain/period.vo.ts'

export class ImportWindowFilter {
	static isWithinWindow(
		period: Period,
		referencePeriod: string,
		windowMonths: number | null,
	): boolean {
		if (windowMonths === null) return true
		return period.isWithinWindow(referencePeriod, windowMonths)
	}
}
