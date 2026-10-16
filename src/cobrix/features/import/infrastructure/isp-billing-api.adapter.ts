/**
 * ISP Billing API Adapter (Anti-Corruption Layer)
 *
 * Implements BillingApiPort by delegating to BillingApiClient.
 * Supports static client or dynamic provider function.
 */

import type { BillingApiClient } from '../../../shared/infrastructure/billing-api.client.ts'
import type {
	BillingApiPort,
	ImportableContract,
} from '../domain/billing-api.port.ts'

export class IspBillingApiAdapter implements BillingApiPort {
	private readonly getClient: () => BillingApiClient

	constructor(clientOrProvider: BillingApiClient | (() => BillingApiClient)) {
		if (typeof clientOrProvider === 'function') {
			this.getClient = clientOrProvider
		} else {
			this.getClient = () => clientOrProvider
		}
	}

	async fetchContractIds(): Promise<readonly number[]> {
		return this.getClient().getContractIds()
	}

	async fetchContract(contractId: number): Promise<ImportableContract | null> {
		const rows = await this.getClient().getContractInstallments(contractId)
		if (!rows || rows.length === 0) return null

		const first = rows[0]!
		const installments =
			first.deuda_id === '0'
				? []
				: rows.map(r => ({
						deudaId: r.deuda_id,
						amount: r.deuda,
						status: r.estado,
						debtDetail: r.detalle_deuda ?? [],
					}))

		return {
			contractId: first.contrato_id,
			code: first.codigo,
			status: first.estado,
			planName: first.nombre_plan,
			planPrice: Number(first.precio_servicio),
			branchName: first.nombre_sucursal,
			holderTaxId: first.identificacion_contrato,
			holderName: first.nombre_contrato,
			phone: first.telefono,
			email: first.email,
			address: first.direccion,
			installments,
		}
	}
}
