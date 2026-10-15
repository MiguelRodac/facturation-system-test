/**
 * ISP Billing API Adapter (Anti-Corruption Layer)
 *
 * Implements BillingApiPort by delegating to BillingApiClient.
 */

import type { BillingApiClient } from '../../../shared/infrastructure/billing-api.client.ts'
import type {
	BillingApiPort,
	ImportableContract,
} from '../domain/ports/billing-api.port.ts'

export class IspBillingApiAdapter implements BillingApiPort {
	private readonly client: BillingApiClient

	constructor(client: BillingApiClient) {
		this.client = client
	}

	async fetchContractIds(): Promise<readonly number[]> {
		return this.client.getContractIds()
	}

	async fetchContract(contractId: number): Promise<ImportableContract | null> {
		const rows = await this.client.getContractInstallments(contractId)
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
			email: first.email,
			phone: first.telefono,
			address: first.direccion,
			installments,
		}
	}
}
