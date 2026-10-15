/**
 * ISP Billing API Adapter (Anti-Corruption Layer)
 *
 * Implements BillingApiPort by delegating to BillingApiClient and mapping
 * raw external structures to clean domain types.
 */

import type { BillingApiClient } from '../../../shared/infrastructure/billing-api.client.ts'
import type { BillingApiPort, ImportableContract, ImportableInstallment } from '../domain/billing-api.port.ts'

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
		if (!rows || rows.length === 0) {
			return null
		}

		const first = rows[0]
		if (!first) {
			return null
		}

		const planPrice = Number.parseFloat(first.precio_servicio) || 0

		// Check if contract has zero debt (deuda_id === "0")
		if (rows.length === 1 && first.deuda_id === '0') {
			return {
				contractId: first.contrato_id,
				code: first.codigo,
				holderTaxId: first.identificacion_contrato,
				holderName: first.nombre_contrato,
				phone: first.telefono,
				email: first.email,
				address: first.direccion,
				status: first.estado,
				planName: first.nombre_plan,
				planPrice,
				branchName: first.nombre_sucursal,
				currencySigla: first.moneda_sigla,
				installments: [],
			}
		}

		const installments: ImportableInstallment[] = []
		for (const row of rows) {
			if (row.deuda_id === '0') continue
			installments.push({
				deudaId: row.deuda_id,
				amount: row.deuda,
				debtDetail: row.detalle_deuda ?? [],
			})
		}

		return {
			contractId: first.contrato_id,
			code: first.codigo,
			holderTaxId: first.identificacion_contrato,
			holderName: first.nombre_contrato,
			phone: first.telefono,
			email: first.email,
			address: first.direccion,
			status: first.estado,
			planName: first.nombre_plan,
			planPrice,
			branchName: first.nombre_sucursal,
			currencySigla: first.moneda_sigla,
			installments,
		}
	}
}
