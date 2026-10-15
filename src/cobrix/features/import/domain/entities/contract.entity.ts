/**
 * Contract Domain Entity (docs/ENUNCIADO.md §3.5, §4)
 *
 * Represents a service contract belonging to a customer.
 */

export interface ContractEntity {
	readonly id: number
	readonly code: string
	readonly customerId: string
	readonly status: string
	readonly planName: string
	readonly planPrice: number
	readonly branchName?: string
	readonly createdAt?: string
}
