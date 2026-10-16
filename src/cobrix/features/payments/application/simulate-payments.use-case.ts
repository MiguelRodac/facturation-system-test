/**
 * Simulate Payments Use Case (docs/ENUNCIADO.md §3.3, §4, §5)
 * Single Responsibility: Simulate payment reconciliation without updating database state
 */

import type { PaymentSummary } from '../domain/payment.entities.ts'
import type { ReconcileOptions, ReconcilePaymentsUseCase } from './reconcile-payments.use-case.ts'

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
