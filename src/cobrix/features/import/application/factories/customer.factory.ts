/**
 * Customer Factory (docs/ENUNCIADO.md §3.5, §4, §5)
 *
 * Encapsulates the instantiation and normalization of Customer domain entities.
 */

import { Identification } from '../../../../shared/domain/identification.vo.ts'
import type { CustomerEntity } from '../../domain/entities/customer.entity.ts'
import type { ImportableContract } from '../../domain/ports/billing-api.port.ts'

export class CustomerFactory {
	static createFromContract(contract: ImportableContract, createdAt?: string): CustomerEntity {
		const identification = Identification.parse(contract.holderTaxId)
		return {
			id: identification.normalized,
			name: contract.holderName,
			personType: identification.personType,
			email: contract.email,
			phone: contract.phone,
			address: contract.address,
			origin: 'ISP',
			createdAt,
		}
	}
}
