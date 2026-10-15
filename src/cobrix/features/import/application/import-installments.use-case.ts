/**
 * Import Installments Use Case (docs/ENUNCIADO.md §3.1, §3.2, §4, §5)
 *
 * Orchestrates the synchronization workflow across domain rules, factories, and ports:
 * 1. Resolves configuration parameters from ConfigurationRepository.
 * 2. Fetches pending contracts from ISP via BillingApiPort.
 * 3. Evaluates business rules via ImportEvaluatorService.
 * 4. Checks deduplication and caps via ImportCapPolicy.
 * 5. Uses factories to instantiate domain models and persists via ImportRepositoryPort.
 */

import type { ConfigurationEntity } from '../../configuration/domain/configuration.entity.ts'
import type { ConfigurationRepository } from '../../configuration/domain/configuration.repository.ts'
import type { BillingApiPort } from '../domain/billing-api.port.ts'
import type { ImportRepositoryPort } from '../domain/import.repository.ts'
import type { ImportSummary, InstallmentEvaluationItem } from '../domain/import.types.ts'
import { ImportCapPolicy } from '../domain/import-cap.policy.ts'
import { ImportEvaluatorService } from '../domain/import-evaluator.service.ts'
import { ContractFactory, CustomerFactory, InvoiceFactory } from './import.factories.ts'

export interface ImportOptions {
	readonly isSimulation?: boolean
	readonly configOverride?: Partial<ConfigurationEntity>
	readonly referenceDate?: Date
}

export class ImportInstallmentsUseCase {
	private readonly billingApi: BillingApiPort
	private readonly repo: ImportRepositoryPort
	private readonly configRepo: ConfigurationRepository

	constructor(
		billingApi: BillingApiPort,
		repo: ImportRepositoryPort,
		configRepo: ConfigurationRepository,
	) {
		this.billingApi = billingApi
		this.repo = repo
		this.configRepo = configRepo
	}

	async execute(options: ImportOptions = {}): Promise<ImportSummary> {
		const isSimulation = options.isSimulation ?? false
		const startedAt = new Date().toISOString()
		const now = options.referenceDate ?? new Date()
		const referencePeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

		const baseConfig = await this.configRepo.get()
		const config: ConfigurationEntity = {
			...baseConfig,
			...(options.configOverride ?? {}),
		}

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
				const evaluation = ImportEvaluatorService.evaluate(rawContract, config, referencePeriod)
				items.push(...evaluation.items)

				if (!evaluation.isEligible) {
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

					// Enforce run caps
					const capCheck = ImportCapPolicy.canImport(
						runningNewInvoicesCount,
						runningNewAmountCents,
						candidate.money.cents,
						config.maxNewInvoices,
						config.maxNewAmount,
					)

					if (!capCheck.allowed) {
						items.push({
							contractId: rawContract.contractId,
							installmentId: candidate.installmentId,
							period: candidate.period.code,
							amount: candidate.money.dollars,
							result: 'STOPPED_BY_CAP',
							reason: capCheck.reason,
						})
						continue
					}

					// Approved for import
					runningNewInvoicesCount++
					runningNewAmountCents += candidate.money.cents
					importedInvoicesCount++
					importedAmountCents += candidate.money.cents

					const customer = CustomerFactory.createFromContract(rawContract, startedAt)
					const contract = ContractFactory.createFromContract(rawContract, customer.id)
					importedCustomerIds.add(customer.id)

					items.push({
						contractId: rawContract.contractId,
						installmentId: candidate.installmentId,
						period: candidate.period.code,
						amount: candidate.money.dollars,
						result: 'IMPORTED',
					})

					if (!isSimulation) {
						const invoice = InvoiceFactory.createFromCandidate(
							candidate,
							contract.id,
							customer.id,
							startedAt,
						)

						await this.repo.saveCustomer(customer)
						await this.repo.saveContract(contract)
						await this.repo.saveInvoice(invoice)
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
}
