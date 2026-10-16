/**
 * ISP Payment Billing API Adapter (Anti-Corruption Layer)
 *
 * Implements PaymentBillingApiPort by delegating to BillingApiClient.
 * Supports static client or dynamic provider function.
 */

import type { BillingApiClient } from '../../../shared/infrastructure/billing-api.client.ts'
import type {
	PaymentBillingApiPort,
	PaymentBookRow,
} from '../domain/payment-billing-api.port.ts'

export class IspPaymentBillingApiAdapter implements PaymentBillingApiPort {
	private readonly getClient: () => BillingApiClient

	constructor(clientOrProvider: BillingApiClient | (() => BillingApiClient)) {
		if (typeof clientOrProvider === 'function') {
			this.getClient = clientOrProvider
		} else {
			this.getClient = () => clientOrProvider
		}
	}

	async fetchPaymentBook(contractId: number): Promise<readonly PaymentBookRow[]> {
		const rawItems = await this.getClient().getPaymentInformation(contractId)
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
