/**
 * Cobrix Configuration Domain Entity (docs/ENUNCIADO.md §3.1)
 *
 * Represents business synchronization rules and caps configured for Cobrix.
 */

export interface ConfigurationEntity {
	readonly id: number
	readonly importableStatuses: readonly string[]
	readonly importWindowMonths: number | null
	readonly maxRecentInstallments: number | null
	readonly graceDays: number
	readonly maxNewInvoices: number | null
	readonly maxNewAmount: number | null
	readonly excludedDocTypes: readonly string[]
	readonly currencyMinRatio: number
	readonly residualThresholdCents: number
	readonly updatedAt?: string
}

export const DEFAULT_CONFIGURATION: ConfigurationEntity = {
	id: 1,
	importableStatuses: ['ACTIVO', 'CORTADO'],
	importWindowMonths: null,
	maxRecentInstallments: null,
	graceDays: 0,
	maxNewInvoices: null,
	maxNewAmount: null,
	excludedDocTypes: [],
	currencyMinRatio: 0.01,
	residualThresholdCents: 1,
}
