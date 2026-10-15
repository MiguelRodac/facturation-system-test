/**
 * Recent Installments Filter (docs/ENUNCIADO.md §3.1 line 46)
 *
 * Keeps only the N most recent installments for a contract when maxRecentInstallments is configured.
 */

export interface InstallmentsSlice<T> {
	readonly kept: readonly T[]
	readonly discarded: readonly T[]
}

export class RecentInstallmentsFilter {
	static slice<T>(items: readonly T[], maxRecent: number | null): InstallmentsSlice<T> {
		if (maxRecent === null || items.length <= maxRecent) {
			return { kept: items, discarded: [] }
		}

		const cutoffIndex = items.length - maxRecent
		return {
			kept: items.slice(cutoffIndex),
			discarded: items.slice(0, cutoffIndex),
		}
	}
}
