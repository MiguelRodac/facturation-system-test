/**
 * Cobrix Configuration Domain Entity (docs/ENUNCIADO.md §3.1)
 *
 * Represents business synchronization rules, company info, and provider API settings.
 */

export interface ConfigurationEntity {
	readonly id: number
	readonly companyName: string
	readonly companyTaxId: string
	readonly billingEmail: string
	readonly apiUrl: string
	readonly apiUser: string
	readonly apiPassword: string
	readonly importableStatuses: readonly string[]
	readonly importWindowMonths: number | null
	readonly maxRecentInstallments: number | null
	readonly graceDays: number
	readonly maxNewInvoices: number | null
	readonly maxNewAmount: number | null
	readonly excludedDocTypes: readonly string[]
	readonly currencyMinRatio: number
	readonly residualThresholdCents: number
	readonly autoRunHour?: string | null
	readonly autoRunEnabled: boolean
	readonly updatedAt?: string
}

