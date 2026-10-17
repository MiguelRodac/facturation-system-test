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

		const contractIds = this.repo.getContractsWithReconcilableInvoices
			? await this.repo.getContractsWithReconcilableInvoices()
			: await this.repo.getContractsWithOpenInvoices()
		const items: PaymentEvaluationItem[] = []

		let totalContractsChecked = 0
		let totalInvoicesEvaluated = 0
		let paidInvoicesCount = 0
		let paidAmountCents = 0
		let partialPaymentsCount = 0
		let reopenedInvoicesCount = 0
		let reopenedAmountCents = 0

		try {
			for (const contractId of contractIds) {
				totalContractsChecked++
				const result = await this.reconcileContractInvoices(contractId, isSimulation, startedAt)
				totalInvoicesEvaluated += result.invoicesEvaluated
				paidInvoicesCount += result.paidCount
				paidAmountCents += result.paidAmountCents
				partialPaymentsCount += result.partialPaymentsCount
				reopenedInvoicesCount += result.reopenedCount
				reopenedAmountCents += result.reopenedAmountCents
				items.push(...result.items)
			}

			const finishedAt = new Date().toISOString()
			const reopenedText =
				reopenedInvoicesCount > 0
					? ` · Reabiertas: ${reopenedInvoicesCount} (USD ${(reopenedAmountCents / 100).toFixed(2)})`
					: ''

			const summaryText = isSimulation
				? `Simulación · Contratos: ${totalContractsChecked} · Facturas: ${totalInvoicesEvaluated} · Pagadas: ${paidInvoicesCount} (USD ${(paidAmountCents / 100).toFixed(2)})${reopenedText}`
				: `Contratos: ${totalContractsChecked} · Evaluadas: ${totalInvoicesEvaluated} · Pagadas: ${paidInvoicesCount} (USD ${(paidAmountCents / 100).toFixed(2)}) · Parciales: ${partialPaymentsCount}${reopenedText}`

			const runId = await this.repo.recordSyncRun({
				isSimulation,
				status: 'COMPLETED',
				summary: summaryText,
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
				reopenedInvoicesCount,
				reopenedAmount: reopenedAmountCents / 100,
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
				summary: `Error · ${errorMessage}`,
				errorMessage,
				startedAt,
				finishedAt,
				items,
			})

			throw error
		}
	}

	private async reconcileContractInvoices(
		contractId: number,
		isSimulation: boolean,
		startedAt: string
	): Promise<{
		invoicesEvaluated: number
		paidCount: number
		paidAmountCents: number
		partialPaymentsCount: number
		reopenedCount: number
		reopenedAmountCents: number
		items: PaymentEvaluationItem[]
	}> {
		const invoices = this.repo.getReconcilableInvoicesByContract
			? await this.repo.getReconcilableInvoicesByContract(contractId)
			: await this.repo.getOpenInvoicesByContract(contractId)

		if (invoices.length === 0) {
			return {
				invoicesEvaluated: 0,
				paidCount: 0,
				paidAmountCents: 0,
				partialPaymentsCount: 0,
				reopenedCount: 0,
				reopenedAmountCents: 0,
				items: [],
			}
		}

		const paymentBookRows = await this.billingApi.fetchPaymentBook(contractId)
		const items: PaymentEvaluationItem[] = []
		let paidCount = 0
		let paidAmountCents = 0
		let partialPaymentsCount = 0
		let reopenedCount = 0
		let reopenedAmountCents = 0

		for (const invoice of invoices) {
			const evaluation = PaymentEvaluatorService.evaluate(invoice, paymentBookRows)

			if (invoice.status === 'OPEN') {
				items.push(evaluation)

				if (evaluation.result === 'PAID') {
					paidCount++
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
			} else if (invoice.status === 'PAID') {
				if (evaluation.result === 'REOPENED') {
					reopenedCount++
					reopenedAmountCents += Math.round(evaluation.newBalance * 100)
					items.push(evaluation)

					if (!isSimulation && this.repo.reopenInvoice) {
						await this.repo.reopenInvoice(invoice.id, evaluation.newBalance)
					}
				}
			}
		}

		return {
			invoicesEvaluated: invoices.length,
			paidCount,
			paidAmountCents,
			partialPaymentsCount,
			reopenedCount,
			reopenedAmountCents,
			items,
		}
	}
}
