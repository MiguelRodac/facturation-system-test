/**
 * Billing API Port for Import Feature (docs/ENUNCIADO.md §3.2 & Anti-Corruption Layer DEC-005)
 *
 * Defines the clean boundary contract through which the Import domain interacts
 * with the external ISP billing system.
 */

export interface ImportableInstallment {
	readonly deudaId: string
	readonly amount: number
	readonly debtDetail: readonly string[]
}

export interface ImportableContract {
	readonly contractId: number
	readonly code: string
	readonly holderTaxId: string
	readonly holderName: string
	readonly phone: string
	readonly email: string
	readonly address: string
	readonly status: string
	readonly planName: string
	readonly planPrice: number
	readonly branchName: string
	readonly currencySigla: string
	readonly installments: readonly ImportableInstallment[]
}

export interface BillingApiPort {
	fetchContractIds(): Promise<readonly number[]>
	fetchContract(contractId: number): Promise<ImportableContract | null>
}
