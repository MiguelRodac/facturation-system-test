/**
 * Payment REST Controller
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRFC9457Error } from '../../../shared/infrastructure/middleware/rfc9457-error-handler.ts'
import { PaymentResponseMapper } from '../application/payment.response.mapper.ts'
import type { ReconcilePaymentsUseCase } from '../application/payment.use-cases.ts'

export class PaymentController {
	private readonly reconcileUseCase: ReconcilePaymentsUseCase

	constructor(reconcileUseCase: ReconcilePaymentsUseCase) {
		this.reconcileUseCase = reconcileUseCase
	}

	async reconcile(req: IncomingMessage, res: ServerResponse, isSimulation = false): Promise<void> {
		try {
			const result = await this.reconcileUseCase.execute({ isSimulation })
			const dto = PaymentResponseMapper.toDto(result)
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.writeHead(200)
			res.end(JSON.stringify({ data: dto }))
		} catch (err) {
			handleRFC9457Error(err, req, res)
		}
	}
}
