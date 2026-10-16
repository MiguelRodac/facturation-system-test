/**
 * Contract Entity
 * Belongs exclusively to the contracts feature
 */

export interface ContractEntity {
	id: number
	code: string
	customerId: string
	status: string
	planName: string
	planPrice: number
	branchName: string | null
	createdAt?: string
}
