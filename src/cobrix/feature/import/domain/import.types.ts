/**
 * Import Feature Domain Types (docs/ENUNCIADO.md §3.1, §3.2, §4, §5)
 */

export interface ImportConfig {
	readonly importableStatuses: readonly string[]
	readonly importWindowMonths: number | null
	readonly maxRecentInstallments: number | null
	readonly graceDays: number
	readonly maxNewInvoices: number | null
	readonly maxNewAmount: number | null
	readonly excludedDocTypes: readonly string[]
}

export type InstallmentSyncResult =
	| 'IMPORTED'
	| 'ALREADY_IMPORTED'
	| 'EXCLUDED_STATUS'
	| 'EXCLUDED_DOCUMENT'
	| 'INCOHERENT_CURRENCY'
	| 'RESIDUAL_DEBT'
	| 'OUTSIDE_WINDOW'
	| 'MAX_RECENT_LIMIT'
	| 'STOPPED_BY_CAP'
	| 'INVALID_DATA'
	| 'NO_DEBT'

export interface InstallmentEvaluationItem {
	readonly contractId: number
	readonly installmentId: string
	readonly period: string
	readonly amount: number
	readonly result: InstallmentSyncResult
	readonly reason?: string
}

export interface ImportSummary {
	readonly totalContractsChecked: number
	readonly totalInstallmentsChecked: number
	readonly importedInvoicesCount: number
	readonly importedAmount: number
	readonly importedCustomersCount: number
	readonly items: readonly InstallmentEvaluationItem[]
	readonly isSimulation: boolean
	readonly runId?: number
}
