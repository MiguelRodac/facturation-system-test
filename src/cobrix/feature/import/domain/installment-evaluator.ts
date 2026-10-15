/**
 * Installment Evaluator (Domain Service)
 *
 * Implements business rules for contract and installment qualification (§3.1, §4, §5):
 * - Tax ID validation and document type exclusion (§4 line 117-120, §3.1 line 49)
 * - Contract status filtering (§3.1 line 44, §4 line 127)
 * - Currency coherence calculation (< 1% of plan rate, §4 line 127)
 * - Residual balance exclusion (< $0.01, §4 line 125)
 * - Period extraction and chronological sorting (§4 line 126, docs/API.md §3.3)
 * - Import window and max recent installments limits (§3.1 line 45-46)
 */

import type { ContractEntity, CustomerEntity } from '../../../shared/domain/entities.ts'
import { Identification } from '../../../shared/domain/identification.vo.ts'
import { Money } from '../../../shared/domain/money.vo.ts'
import { Period } from '../../../shared/domain/period.vo.ts'
import type { ImportableContract, ImportableInstallment } from './billing-api.port.ts'
import type { ImportConfig, InstallmentEvaluationItem } from './import.types.ts'

export interface CandidateInstallment {
	readonly installmentId: string
	readonly period: Period
	readonly money: Money
	readonly dueDate: string
	readonly cutoffDate: string
}

export interface ContractEvaluation {
	readonly isEligible: boolean
	readonly customer?: CustomerEntity
	readonly contract?: ContractEntity
	readonly candidates: readonly CandidateInstallment[]
	readonly items: readonly InstallmentEvaluationItem[]
}

interface ParsedCandidate {
	readonly inst: ImportableInstallment
	readonly period: Period
	readonly money: Money
}

export class InstallmentEvaluator {
	static evaluate(
		contract: ImportableContract,
		config: ImportConfig,
		referencePeriod: string,
	): ContractEvaluation {
		const items: InstallmentEvaluationItem[] = []

		// 1. Contract with zero debt (deuda_id === "0")
		if (contract.installments.length === 0) {
			items.push({
				contractId: contract.contractId,
				installmentId: '0',
				period: '',
				amount: 0,
				result: 'NO_DEBT',
				reason: 'Contract has zero pending debt (deuda_id is 0)',
			})
			return { isEligible: false, candidates: [], items }
		}

		// 2. Validate identification (Tax ID)
		let identification: Identification
		try {
			identification = Identification.parse(contract.holderTaxId)
		} catch {
			for (const inst of contract.installments) {
				items.push({
					contractId: contract.contractId,
					installmentId: inst.deudaId,
					period: '',
					amount: inst.amount,
					result: 'INVALID_DATA',
					reason: `Invalid identification format: ${contract.holderTaxId}`,
				})
			}
			return { isEligible: false, candidates: [], items }
		}

		// 3. Document type exclusion (e.g. exclude 'J')
		if (identification.prefix && config.excludedDocTypes.includes(identification.prefix)) {
			for (const inst of contract.installments) {
				items.push({
					contractId: contract.contractId,
					installmentId: inst.deudaId,
					period: '',
					amount: inst.amount,
					result: 'EXCLUDED_DOCUMENT',
					reason: `Document prefix '${identification.prefix}' is excluded in configuration`,
				})
			}
			return { isEligible: false, candidates: [], items }
		}

		// 4. Contract status filtering
		if (!config.importableStatuses.includes(contract.status)) {
			for (const inst of contract.installments) {
				items.push({
					contractId: contract.contractId,
					installmentId: inst.deudaId,
					period: '',
					amount: inst.amount,
					result: 'EXCLUDED_STATUS',
					reason: `Contract status '${contract.status}' is excluded by configuration`,
				})
			}
			return { isEligible: false, candidates: [], items }
		}

		// 5. Currency coherence verification (evaluates non-residual amounts > 0 cents)
		const planPrice = contract.planPrice
		const hasIncoherentCurrency = contract.installments.some(inst => {
			const money = Money.fromDollars(inst.amount)
			if (money.cents <= 0) return false // Residual amount, handled by residual check
			return Money.isCurrencyIncoherent(inst.amount, planPrice)
		})

		if (hasIncoherentCurrency) {
			for (const inst of contract.installments) {
				items.push({
					contractId: contract.contractId,
					installmentId: inst.deudaId,
					period: '',
					amount: inst.amount,
					result: 'INCOHERENT_CURRENCY',
					reason: `Installment debt is less than 1% of plan price (${inst.amount} vs ${planPrice})`,
				})
			}
			return { isEligible: false, candidates: [], items }
		}

		// 6. Filter residual debts and extract periods
		const parsedList: ParsedCandidate[] = []
		for (const inst of contract.installments) {
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

			parsedList.push({ inst, period, money })
		}

		// 7. Sort chronologically by period (API delivers in scrambled order)
		parsedList.sort((a, b) => Period.compare(a.period, b.period))

		// 8. Apply import window
		const withinWindowList: ParsedCandidate[] = []
		for (const item of parsedList) {
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
			withinWindowList.push(item)
		}

		// 9. Apply max recent limit
		let keptList: ParsedCandidate[] = withinWindowList
		if (config.maxRecentInstallments !== null && withinWindowList.length > config.maxRecentInstallments) {
			const cutoffIndex = withinWindowList.length - config.maxRecentInstallments
			const discarded = withinWindowList.slice(0, cutoffIndex)
			keptList = withinWindowList.slice(cutoffIndex)

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

		// Build eligible candidates and entities
		const candidates: CandidateInstallment[] = keptList.map(item => ({
			installmentId: item.inst.deudaId,
			period: item.period,
			money: item.money,
			dueDate: item.period.dueDate,
			cutoffDate: item.period.calculateCutoffDate(config.graceDays),
		}))

		const customer: CustomerEntity = {
			id: identification.normalized,
			name: contract.holderName,
			personType: identification.personType,
			email: contract.email,
			phone: contract.phone,
			address: contract.address,
			origin: 'ISP',
		}

		const contractEntity: ContractEntity = {
			id: contract.contractId,
			code: contract.code,
			customerId: identification.normalized,
			status: contract.status,
			planName: contract.planName,
			planPrice: contract.planPrice,
			branchName: contract.branchName,
		}

		return {
			isEligible: true,
			customer,
			contract: contractEntity,
			candidates,
			items,
		}
	}
}
