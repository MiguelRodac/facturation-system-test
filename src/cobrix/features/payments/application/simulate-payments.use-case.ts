/**
 * Simulate Payments Use Case (docs/ENUNCIADO.md §3.3, §5)
 *
 * Simulates payment reconciliation without writing changes to the invoice database.
 */

import type { PaymentSummary } from '../domain/payment.entities.ts'
import {
	type ReconcileOptions,
	ReconcilePaymentsUseCase,
} from './reconcile-payments.use-case.ts'

export class SimulatePaymentsUseCase {
	private readonly reconcileUseCase: ReconcilePaymentsUseCase

	constructor(reconcileUseCase: ReconcilePaymentsUseCase) {
		this.reconcileUseCase = reconcileUseCase
	}

	async execute(options: Omit<ReconcileOptions, 'isSimulation'> = {}): Promise<PaymentSummary> {
		return this.reconcileUseCase.execute({
			...options,
			isSimulation: true,
		})
	}
}
