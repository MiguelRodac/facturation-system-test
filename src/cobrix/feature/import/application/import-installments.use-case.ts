/**
 * Import Installments Use Case (docs/ENUNCIADO.md §3.1, §3.2, §4, §5)
 *
 * Orchestrates the import workflow: fetches from ISP, delegates qualification
 * to InstallmentEvaluator, applies run caps, and persists approved records.
 */

import type { BillingApiPort } from '../domain/billing-api.port.ts'
import type { ImportRepositoryPort } from '../domain/import.repository.port.ts'
import type { ImportConfig, ImportSummary, InstallmentEvaluationItem } from '../domain/import.types.ts'
import { InstallmentEvaluator } from '../domain/installment-evaluator.ts'

export interface ImportOptions {
	readonly isSimulation?: boolean
	readonly configOverride?: Partial<ImportConfig>
	readonly referenceDate?: Date
}

export class ImportInstallmentsUseCase {
	private readonly billingApi: BillingApiPort
	private readonly repo: ImportRepositoryPort

	constructor(billingApi: BillingApiPort, repo: ImportRepositoryPort) {
		this.billingApi = billingApi
		this.repo = repo
	}

	async execute(options: ImportOptions = {}): Promise<ImportSummary> {
		const isSimulation = options.isSimulation ?? false
		const startedAt = new Date().toISOString()
		const now = options.referenceDate ?? new Date()
		const referencePeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

		const config = await this.resolveConfig(options.configOverride)
		const contractIds = await this.billingApi.fetchContractIds()

		const items: InstallmentEvaluationItem[] = []
		let totalContractsChecked = 0
		let totalInstallmentsChecked = 0
		let importedInvoicesCount = 0
		let importedAmountCents = 0
		const importedCustomerIds = new Set<string>()

		let runningNewInvoicesCount = 0
		let runningNewAmountCents = 0

		try {
			for (const contractId of contractIds) {
				totalContractsChecked++
				const rawContract = await this.billingApi.fetchContract(contractId)
				if (!rawContract) continue

				totalInstallmentsChecked += rawContract.installments.length

				// Delegate qualification to pure domain service
				const evaluation = InstallmentEvaluator.evaluate(rawContract, config, referencePeriod)
				items.push(...evaluation.items)

				if (!evaluation.isEligible || !evaluation.customer || !evaluation.contract) {
					continue
				}

				// Process eligible candidates
				for (const candidate of evaluation.candidates) {
					const alreadyImported = await this.repo.isInvoiceImported(candidate.installmentId)
					if (alreadyImported) {
						items.push({
							contractId: rawContract.contractId,
							installmentId: candidate.installmentId,
							period: candidate.period.code,
							amount: candidate.money.dollars,
							result: 'ALREADY_IMPORTED',
							reason: 'Invoice already imported in Cobrix',
						})
						continue
					}

					// Enforce run caps (§3.1 line 48)
					if (config.maxNewInvoices !== null && runningNewInvoicesCount >= config.maxNewInvoices) {
						items.push({
							contractId: rawContract.contractId,
							installmentId: candidate.installmentId,
							period: candidate.period.code,
							amount: candidate.money.dollars,
							result: 'STOPPED_BY_CAP',
							reason: `Exceeded max new invoices cap (${config.maxNewInvoices})`,
						})
						continue
					}

					if (config.maxNewAmount !== null) {
						const candidateTotal = (runningNewAmountCents + candidate.money.cents) / 100
						if (candidateTotal > config.maxNewAmount) {
							items.push({
								contractId: rawContract.contractId,
								installmentId: candidate.installmentId,
								period: candidate.period.code,
								amount: candidate.money.dollars,
								result: 'STOPPED_BY_CAP',
								reason: `Exceeded max new amount cap (${config.maxNewAmount})`,
							})
							continue
						}
					}

					// Approved for import
					runningNewInvoicesCount++
					runningNewAmountCents += candidate.money.cents
					importedInvoicesCount++
					importedAmountCents += candidate.money.cents
					importedCustomerIds.add(evaluation.customer.id)

					items.push({
						contractId: rawContract.contractId,
						installmentId: candidate.installmentId,
						period: candidate.period.code,
						amount: candidate.money.dollars,
						result: 'IMPORTED',
					})

					if (!isSimulation) {
						await this.repo.saveCustomer({
							...evaluation.customer,
							createdAt: startedAt,
						})

						await this.repo.saveContract(evaluation.contract)

						await this.repo.saveInvoice({
							externalInstallmentId: candidate.installmentId,
							contractId: evaluation.contract.id,
							customerId: evaluation.customer.id,
							period: candidate.period.code,
							dueDate: candidate.dueDate,
							cutoffDate: candidate.cutoffDate,
							totalAmount: candidate.money.dollars,
							balance: candidate.money.dollars,
							status: 'OPEN',
							importedAt: startedAt,
						})
					}
				}
			}

			const finishedAt = new Date().toISOString()
			const summaryData = {
				totalContractsChecked,
				totalInstallmentsChecked,
				importedInvoicesCount,
				importedAmount: importedAmountCents / 100,
				importedCustomersCount: importedCustomerIds.size,
				isSimulation,
			}

			const runId = await this.repo.recordSyncRun({
				type: 'IMPORT',
				isSimulation,
				status: 'COMPLETED',
				summary: JSON.stringify(summaryData),
				startedAt,
				finishedAt,
				items,
			})

			return {
				totalContractsChecked,
				totalInstallmentsChecked,
				importedInvoicesCount,
				importedAmount: importedAmountCents / 100,
				importedCustomersCount: importedCustomerIds.size,
				items,
				isSimulation,
				runId,
			}
		} catch (error) {
			const finishedAt = new Date().toISOString()
			const errorMessage = error instanceof Error ? error.message : String(error)

			await this.repo.recordSyncRun({
				type: 'IMPORT',
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

	private async resolveConfig(override?: Partial<ImportConfig>): Promise<ImportConfig> {
		const stored = await this.repo.getConfig()
		return {
			importableStatuses: override?.importableStatuses ?? stored.importableStatuses,
			importWindowMonths: override?.importWindowMonths !== undefined
				? override.importWindowMonths
				: stored.importWindowMonths,
			maxRecentInstallments: override?.maxRecentInstallments !== undefined
				? override.maxRecentInstallments
				: stored.maxRecentInstallments,
			graceDays: override?.graceDays ?? stored.graceDays,
			maxNewInvoices: override?.maxNewInvoices !== undefined
				? override.maxNewInvoices
				: stored.maxNewInvoices,
			maxNewAmount: override?.maxNewAmount !== undefined
				? override.maxNewAmount
				: stored.maxNewAmount,
			excludedDocTypes: override?.excludedDocTypes ?? stored.excludedDocTypes,
		}
	}
}
