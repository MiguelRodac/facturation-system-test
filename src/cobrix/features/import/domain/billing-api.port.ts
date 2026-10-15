/**
 * Billing API Port (docs/API.md §3)
 *
 * Secondary outbound port defining ISP billing communication.
 */

export interface ImportableInstallment {
	readonly deudaId: string
	readonly amount: number
	readonly status: string
	readonly debtDetail: readonly string[]
}

export interface ImportableContract {
	readonly contractId: number
	readonly code: string
	readonly status: string
	readonly planName: string
	readonly planPrice: number
	readonly branchName?: string
	readonly holderTaxId: string
	readonly holderName: string
	readonly email?: string
	readonly phone?: string
	readonly address?: string
	readonly installments: readonly ImportableInstallment[]
}

export interface BillingApiPort {
	fetchContractIds(): Promise<readonly number[]>
	fetchContract(contractId: number): Promise<ImportableContract | null>
}
