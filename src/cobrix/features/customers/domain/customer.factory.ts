/**
 * Customer Factory
 * Encapsulates instantiation and identity normalization of CustomerEntity
 */

import { Identification } from '../../../shared/domain/identification.vo.ts'
import type { CustomerEntity } from './customer.entities.ts'

export interface CreateCustomerFromExternalParams {
	readonly holderTaxId: string
	readonly holderName: string
	readonly email?: string | null
	readonly phone?: string | null
	readonly address?: string | null
}

export class CustomerFactory {
	static createFromExternal(
		params: CreateCustomerFromExternalParams,
		createdAt: string = new Date().toISOString(),
	): CustomerEntity {
		const identification = Identification.parse(params.holderTaxId)
		return {
			id: identification.normalized,
			name: params.holderName,
			personType: identification.personType,
			email: params.email ?? null,
			phone: params.phone ?? null,
			address: params.address ?? null,
			origin: 'ISP',
			createdAt,
		}
	}

	static createFromContract = CustomerFactory.createFromExternal
}
