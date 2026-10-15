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

export const DEFAULT_CONFIGURATION: ConfigurationEntity = {
	id: 1,
	companyName: 'Cobrix Telecom Demo',
	companyTaxId: 'J-12345678-9',
	billingEmail: 'cobranzas@cobrix.local',
	apiUrl: 'http://127.0.0.1:4310',
	apiUser: 'cobrix',
	apiPassword: 'cobrix-sandbox',
	importableStatuses: ['ACTIVO', 'CORTADO'],
	importWindowMonths: null,
	maxRecentInstallments: null,
	graceDays: 0,
	maxNewInvoices: null,
	maxNewAmount: null,
	excludedDocTypes: [],
	currencyMinRatio: 0.01,
	residualThresholdCents: 1,
	autoRunHour: '03:00',
	autoRunEnabled: false,
}
