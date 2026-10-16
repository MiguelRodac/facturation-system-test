/**
 * Payment REST Controller
 */

import type { NextFunction, Request, Response } from 'express'
import { PaymentResponseMapper } from '../application/payment.response.mapper.ts'
import type { ReconcilePaymentsUseCase } from '../application/reconcile-payments.use-case.ts'

export class PaymentController {
	private readonly reconcileUseCase: ReconcilePaymentsUseCase

	constructor(reconcileUseCase: ReconcilePaymentsUseCase) {
		this.reconcileUseCase = reconcileUseCase
	}

	async reconcile(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const isSimulation = req.query.simulate === 'true'
			const result = await this.reconcileUseCase.execute({ isSimulation })
			const dto = PaymentResponseMapper.toDto(result)
			res.status(200).json({ data: dto })
		} catch (err) {
			next(err)
		}
	}
}
