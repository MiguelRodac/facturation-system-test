/**
 * Payment REST Controller
 */

import type { NextFunction, Request, Response } from 'express'
import { PaymentRequestMapper } from './payment.request.mapper.ts'
import { PaymentResponseMapper } from '../application/payment.response.mapper.ts'
import type { ReconcilePaymentsUseCase } from '../application/reconcile-payments.use-case.ts'

export class PaymentController {
	private readonly reconcileUseCase: ReconcilePaymentsUseCase

	constructor(reconcileUseCase: ReconcilePaymentsUseCase) {
		this.reconcileUseCase = reconcileUseCase
	}

	async reconcile(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const query = PaymentRequestMapper.toQuery(req.query)
			const result = await this.reconcileUseCase.execute({ isSimulation: query.isSimulation })
			const dto = PaymentResponseMapper.toDto(result)
			res.status(200).json({ data: dto })
		} catch (err) {
			next(err)
		}
	}
}
