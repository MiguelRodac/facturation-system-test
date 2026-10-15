/**
 * ISP Payment Billing API Adapter (Anti-Corruption Layer)
 *
 * Implements PaymentBillingApiPort by delegating to BillingApiClient.
 */

import type { BillingApiClient } from '../../../shared/infrastructure/billing-api.client.ts'
import type {
	PaymentBillingApiPort,
	PaymentBookRow,
} from '../domain/payment-billing-api.port.ts'

export class IspPaymentBillingApiAdapter implements PaymentBillingApiPort {
	private readonly client: BillingApiClient

	constructor(client: BillingApiClient) {
		this.client = client
	}

	async fetchPaymentBook(contractId: number): Promise<readonly PaymentBookRow[]> {
		const rawItems = await this.client.getPaymentInformation(contractId)
		if (!rawItems || !Array.isArray(rawItems)) return []

		return rawItems.map(item => ({
			installmentId: String(item.detalle_pago.id_cuota),
			period: item.detalle_pago.periodo_cuota,
			fee: item.detalle_pago.tarifa,
			amountPaid: item.detalle_pago.valor_pago,
			remainingBalance: item.detalle_pago.saldo_cuota,
			discount: item.detalle_pago.descuento,
			receiptId: item.id_factura,
			receiptNumber: item.num_factura,
			receiptEmissionDate: item.fecha_emision,
		}))
	}
}
