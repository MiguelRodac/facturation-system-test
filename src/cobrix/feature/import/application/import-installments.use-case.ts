/**
 * Import Installments Use Case (docs/ENUNCIADO.md §3.1, §3.2, §4, §5)
 *
 * Implements the core business logic of importing customers, contracts,
 * and pending invoices from the external ISP billing system.
 */

import { Identification } from '../../../shared/domain/identification.vo.ts'
import { Money } from '../../../shared/domain/money.vo.ts'
import { Period } from '../../../shared/domain/period.vo.ts'
import type { BillingApiPort, ImportableInstallment } from '../domain/billing-api.port.ts'
import type { ImportRepositoryPort } from '../domain/import.repository.port.ts'
import type { ImportConfig, ImportSummary, InstallmentEvaluationItem } from '../domain/import.types.ts'

export interface ImportOptions {
	readonly isSimulation?: boolean
	readonly configOverride?: Partial<ImportConfig>
	readonly referenceDate?: Date
}

interface ParsedInstallment {
	readonly inst: ImportableInstallment
	readonly period: Period
	readonly money: Money
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

		// 1. Resolve configuration
		const storedConfig = await this.repo.getConfig()
		const config: ImportConfig = {
			importableStatuses: options.configOverride?.importableStatuses ?? storedConfig.importableStatuses,
			importWindowMonths: options.configOverride?.importWindowMonths !== undefined
				? options.configOverride.importWindowMonths
				: storedConfig.importWindowMonths,
			maxRecentInstallments: options.configOverride?.maxRecentInstallments !== undefined
				? options.configOverride.maxRecentInstallments
				: storedConfig.maxRecentInstallments,
			graceDays: options.configOverride?.graceDays ?? storedConfig.graceDays,
			maxNewInvoices: options.configOverride?.maxNewInvoices !== undefined
				? options.configOverride.maxNewInvoices
				: storedConfig.maxNewInvoices,
			maxNewAmount: options.configOverride?.maxNewAmount !== undefined
				? options.configOverride.maxNewAmount
				: storedConfig.maxNewAmount,
			excludedDocTypes: options.configOverride?.excludedDocTypes ?? storedConfig.excludedDocTypes,
		}

		const items: InstallmentEvaluationItem[] = []
		let totalContractsChecked = 0
		let totalInstallmentsChecked = 0
		let importedInvoicesCount = 0
		let importedAmountCents = 0
		const importedCustomerIds = new Set<string>()

		let runningNewInvoicesCount = 0
		let runningNewAmountCents = 0

		try {
			// 2. Fetch all contract IDs from the ISP
			const contractIds = await this.billingApi.fetchContractIds()

			// 3. Process each contract
			for (const contractId of contractIds) {
				totalContractsChecked++
				const contract = await this.billingApi.fetchContract(contractId)
				if (!contract) continue

				// Check if contract has zero debt (deuda_id === "0")
				if (contract.installments.length === 0) {
					items.push({
						contractId: contract.contractId,
						installmentId: '0',
						period: '',
						amount: 0,
						result: 'NO_DEBT',
						reason: 'Contract has zero pending debt (deuda_id is 0)',
					})
					continue
				}

				// Validate identification (Tax ID)
				let identification: Identification
				try {
					identification = Identification.parse(contract.holderTaxId)
				} catch {
					for (const inst of contract.installments) {
						totalInstallmentsChecked++
						items.push({
							contractId: contract.contractId,
							installmentId: inst.deudaId,
							period: '',
							amount: inst.amount,
							result: 'INVALID_DATA',
							reason: `Invalid identification format: ${contract.holderTaxId}`,
						})
					}
					continue
				}

				// Check document type exclusions (e.g., exclude 'J' juridical)
				if (identification.prefix && config.excludedDocTypes.includes(identification.prefix)) {
					for (const inst of contract.installments) {
						totalInstallmentsChecked++
						items.push({
							contractId: contract.contractId,
							installmentId: inst.deudaId,
							period: '',
							amount: inst.amount,
							result: 'EXCLUDED_DOCUMENT',
							reason: `Document prefix '${identification.prefix}' is excluded in configuration`,
						})
					}
					continue
				}

				// Check contract status
				if (!config.importableStatuses.includes(contract.status)) {
					for (const inst of contract.installments) {
						totalInstallmentsChecked++
						items.push({
							contractId: contract.contractId,
							installmentId: inst.deudaId,
							period: '',
							amount: inst.amount,
							result: 'EXCLUDED_STATUS',
							reason: `Contract status '${contract.status}' is excluded by configuration`,
						})
					}
					continue
				}

				// Check currency coherence (less than 1% of plan rate)
				const planPrice = contract.planPrice
				const hasIncoherentCurrency = contract.installments.some(inst => {
					if (inst.amount <= 0) return false
					return Money.isCurrencyIncoherent(inst.amount, planPrice)
				})

				if (hasIncoherentCurrency) {
					for (const inst of contract.installments) {
						totalInstallmentsChecked++
						items.push({
							contractId: contract.contractId,
							installmentId: inst.deudaId,
							period: '',
							amount: inst.amount,
							result: 'INCOHERENT_CURRENCY',
							reason: `Installment debt is less than 1% of plan price (${inst.amount} vs ${planPrice})`,
						})
					}
					continue
				}

				// Filter out residual amounts and parse periods
				const candidateInstallments: ParsedInstallment[] = []
				for (const inst of contract.installments) {
					totalInstallmentsChecked++
					const money = Money.fromDollars(inst.amount)
					if (money.isResidual() || money.cents <= 0) {
						items.push({
							contractId: contract.contractId,
							installmentId: inst.deudaId,
							period: '',
							amount: inst.amount,
							result: 'RESIDUAL_DEBT',
							reason: `Residual debt less than one cent (${inst.amount})`,
						})
						continue
					}

					let period: Period
					try {
						const detailStr = inst.debtDetail[0] ?? ''
						period = Period.fromDebtDetail(detailStr)
					} catch {
						items.push({
							contractId: contract.contractId,
							installmentId: inst.deudaId,
							period: '',
							amount: inst.amount,
							result: 'INVALID_DATA',
							reason: `Unable to parse period from debt detail: ${JSON.stringify(inst.debtDetail)}`,
						})
						continue
					}

					candidateInstallments.push({ inst, period, money })
				}

				// Sort chronologically by period (API delivers in scrambled order)
				candidateInstallments.sort((a, b) => Period.compare(a.period, b.period))

				// Apply import window
				const withinWindowInstallments: ParsedInstallment[] = []
				for (const item of candidateInstallments) {
					if (config.importWindowMonths !== null) {
						if (!item.period.isWithinWindow(referencePeriod, config.importWindowMonths)) {
							items.push({
								contractId: contract.contractId,
								installmentId: item.inst.deudaId,
								period: item.period.code,
								amount: item.money.dollars,
								result: 'OUTSIDE_WINDOW',
								reason: `Period ${item.period.code} outside ${config.importWindowMonths}-month window`,
							})
							continue
						}
					}
					withinWindowInstallments.push(item)
				}

				// Apply max recent limit (keep the most recent N installments)
				let keptInstallments: ParsedInstallment[] = withinWindowInstallments
				if (config.maxRecentInstallments !== null && withinWindowInstallments.length > config.maxRecentInstallments) {
					const cutoffIndex = withinWindowInstallments.length - config.maxRecentInstallments
					const discarded = withinWindowInstallments.slice(0, cutoffIndex)
					keptInstallments = withinWindowInstallments.slice(cutoffIndex)

					for (const older of discarded) {
						items.push({
							contractId: contract.contractId,
							installmentId: older.inst.deudaId,
							period: older.period.code,
							amount: older.money.dollars,
							result: 'MAX_RECENT_LIMIT',
							reason: `Exceeded max recent limit (${config.maxRecentInstallments}), older installment discarded`,
						})
					}
				}

				// Process installments for import
				for (const item of keptInstallments) {
					const alreadyImported = await this.repo.isInvoiceImported(item.inst.deudaId)
					if (alreadyImported) {
						items.push({
							contractId: contract.contractId,
							installmentId: item.inst.deudaId,
							period: item.period.code,
							amount: item.money.dollars,
							result: 'ALREADY_IMPORTED',
							reason: 'Invoice already imported in Cobrix',
						})
						continue
					}

					// Check run caps
					if (config.maxNewInvoices !== null && runningNewInvoicesCount >= config.maxNewInvoices) {
						items.push({
							contractId: contract.contractId,
							installmentId: item.inst.deudaId,
							period: item.period.code,
							amount: item.money.dollars,
							result: 'STOPPED_BY_CAP',
							reason: `Exceeded max new invoices cap (${config.maxNewInvoices})`,
						})
						continue
					}

					if (config.maxNewAmount !== null) {
						const candidateTotal = (runningNewAmountCents + item.money.cents) / 100
						if (candidateTotal > config.maxNewAmount) {
							items.push({
								contractId: contract.contractId,
								installmentId: item.inst.deudaId,
								period: item.period.code,
								amount: item.money.dollars,
								result: 'STOPPED_BY_CAP',
								reason: `Exceeded max new amount cap (${config.maxNewAmount})`,
							})
							continue
						}
					}

					// Valid for import
					runningNewInvoicesCount++
					runningNewAmountCents += item.money.cents
					importedInvoicesCount++
					importedAmountCents += item.money.cents
					importedCustomerIds.add(identification.normalized)

					items.push({
						contractId: contract.contractId,
						installmentId: item.inst.deudaId,
						period: item.period.code,
						amount: item.money.dollars,
						result: 'IMPORTED',
					})

					if (!isSimulation) {
						// Persist customer
						await this.repo.saveCustomer({
							id: identification.normalized,
							name: contract.holderName,
							personType: identification.personType,
							email: contract.email,
							phone: contract.phone,
							address: contract.address,
							origin: 'ISP',
							createdAt: startedAt,
						})

						// Persist contract
						await this.repo.saveContract({
							id: contract.contractId,
							code: contract.code,
							customerId: identification.normalized,
							status: contract.status,
							planName: contract.planName,
							planPrice: contract.planPrice,
							branchName: contract.branchName,
						})

						// Persist invoice
						const cutoffDate = item.period.calculateCutoffDate(config.graceDays)
						await this.repo.saveInvoice({
							externalInstallmentId: item.inst.deudaId,
							contractId: contract.contractId,
							customerId: identification.normalized,
							period: item.period.code,
							dueDate: item.period.dueDate,
							cutoffDate,
							totalAmount: item.money.dollars,
							balance: item.money.dollars,
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
}
