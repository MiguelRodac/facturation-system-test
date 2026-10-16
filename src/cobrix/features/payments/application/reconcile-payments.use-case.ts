/**
 * Reconcile Payments Use Case (docs/ENUNCIADO.md §3.3, §4, §5)
 * Single Responsibility: Query payment book from ISP API and reconcile open invoices
 */

import type { PaymentBillingApiPort } from '../domain/payment-billing-api.port.ts'
import type {
	PaymentEvaluationItem,
	PaymentSummary,
} from '../domain/payment.entities.ts'
import { PaymentEvaluatorService } from '../domain/payment-evaluator.service.ts'
import type { PaymentRepositoryPort } from '../domain/payment.repository.ts'

export interface ReconcileOptions {
	readonly isSimulation?: boolean
}

export class ReconcilePaymentsUseCase {
	private readonly billingApi: PaymentBillingApiPort
	private readonly repo: PaymentRepositoryPort

	constructor(billingApi: PaymentBillingApiPort, repo: PaymentRepositoryPort) {
		this.billingApi = billingApi
		this.repo = repo
	}

	async execute(options: ReconcileOptions = {}): Promise<PaymentSummary> {
		const isSimulation = options.isSimulation ?? false
		const startedAt = new Date().toISOString()

		const contractIds = await this.repo.getContractsWithOpenInvoices()
		const items: PaymentEvaluationItem[] = []

		let totalContractsChecked = 0
		let totalInvoicesEvaluated = 0
		let paidInvoicesCount = 0
		let paidAmountCents = 0
		let partialPaymentsCount = 0

		try {
			for (const contractId of contractIds) {
				totalContractsChecked++
				const openInvoices = await this.repo.getOpenInvoicesByContract(contractId)
				if (openInvoices.length === 0) continue

				const paymentBookRows = await this.billingApi.fetchPaymentBook(contractId)

				for (const invoice of openInvoices) {
					totalInvoicesEvaluated++
					const evaluation = PaymentEvaluatorService.evaluate(invoice, paymentBookRows)
					items.push(evaluation)

					if (evaluation.result === 'PAID') {
						paidInvoicesCount++
						paidAmountCents += Math.round(evaluation.previousBalance * 100)

						if (!isSimulation) {
							await this.repo.markInvoicePaid(
								invoice.id,
								evaluation.paidByInvoiceNumber ?? '',
								evaluation.paidAt ?? startedAt,
							)
						}
					} else if (evaluation.result === 'PARTIAL_PAYMENT') {
						partialPaymentsCount++

						if (!isSimulation) {
							await this.repo.updateInvoicePartialPayment(
								invoice.id,
								evaluation.newBalance,
							)
						}
					}
				}
			}

			const finishedAt = new Date().toISOString()
			const summaryData = {
				totalContractsChecked,
				totalInvoicesEvaluated,
				paidInvoicesCount,
				paidAmount: paidAmountCents / 100,
				partialPaymentsCount,
				isSimulation,
			}

			const runId = await this.repo.recordSyncRun({
				isSimulation,
				status: 'COMPLETED',
				summary: JSON.stringify(summaryData),
				startedAt,
				finishedAt,
				items,
			})

			return {
				totalContractsChecked,
				totalInvoicesEvaluated,
				paidInvoicesCount,
				paidAmount: paidAmountCents / 100,
				partialPaymentsCount,
				items,
				isSimulation,
				runId,
			}
		} catch (error) {
			const finishedAt = new Date().toISOString()
			const errorMessage = error instanceof Error ? error.message : String(error)

			await this.repo.recordSyncRun({
				isSimulation,
				status: 'FAILED',
				summary: JSON.stringify({ error: errorMessage }),
				errorMessage,
				startedAt,
				finishedAt,
				items,
			})

			throw error
		}
	}
}
