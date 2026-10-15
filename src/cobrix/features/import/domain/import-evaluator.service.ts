/**
 * Import Evaluator Domain Service (docs/ENUNCIADO.md §3.1, §4, §5)
 *
 * Implements the contract and installment qualification pipeline broken down into
 * 10 granular, individually callable domain validation and filtering methods:
 *
 *  1. checkZeroDebt           -> detects contracts with zero debt (deuda_id: "0")
 *  2. validateIdentification   -> parses and normalizes holder tax ID
 *  3. checkDocumentType        -> excludes forbidden document prefixes (e.g. 'J')
 *  4. checkContractStatus      -> filters non-importable contract statuses
 *  5. checkCurrencyCoherence   -> detects currency corruption (< 1% of plan rate)
 *  6. filterResidualDebts      -> filters balances less than 1 cent ($0.01)
 *  7. sortChronologically      -> sorts installments by Period in ascending order
 *  8. filterByWindow           -> filters installments outside sliding month window
 *  9. filterByRecentLimit      -> slices installments to keep only the N most recent
 * 10. buildCandidates          -> generates candidate models with grace-day cutoff dates
 *
 * The main `evaluate()` method orchestrates these 10 steps sequentially.
 */

import { Identification } from '../../../shared/domain/identification.vo.ts'
import { Money } from '../../../shared/domain/money.vo.ts'
import { Period } from '../../../shared/domain/period.vo.ts'
import type { ConfigurationEntity } from '../../configuration/domain/configuration.entity.ts'
import type {
	ImportableContract,
	ImportableInstallment,
} from './billing-api.port.ts'
import type {
	CandidateInstallment,
	ContractEvaluation,
	InstallmentEvaluationItem,
} from './import.types.ts'

export interface ParsedCandidate {
	readonly inst: ImportableInstallment
	readonly period: Period
	readonly money: Money
}

export class ImportEvaluatorService {
	/**
	 * Step 1: Detects contracts with no debt (e.g. deuda_id === "0" / empty installments).
	 */
	static checkZeroDebt(contract: ImportableContract): InstallmentEvaluationItem | null {
		if (contract.installments.length === 0) {
			return {
				contractId: contract.contractId,
				installmentId: '0',
				period: '',
				amount: 0,
				result: 'NO_DEBT',
				reason: 'Contract has zero pending debt (deuda_id is 0)',
			}
		}
		return null
	}

	/**
	 * Step 2: Validates and parses the customer identification string.
	 */
	static validateIdentification(
		holderTaxId: string,
		contractId: number,
		installments: readonly ImportableInstallment[],
	): { identification?: Identification; errors?: InstallmentEvaluationItem[] } {
		try {
			const identification = Identification.parse(holderTaxId)
			return { identification }
		} catch {
			const errors: InstallmentEvaluationItem[] = installments.map(inst => ({
				contractId,
				installmentId: inst.deudaId,
				period: '',
				amount: inst.amount,
				result: 'INVALID_DATA',
				reason: `Invalid identification format: ${holderTaxId}`,
			}))
			return { errors }
		}
	}

	/**
	 * Step 3: Checks if the identification document prefix is excluded by configuration.
	 */
	static checkDocumentType(
		prefix: string | undefined,
		excludedDocTypes: readonly string[],
		contractId: number,
		installments: readonly ImportableInstallment[],
	): InstallmentEvaluationItem[] | null {
		if (prefix && excludedDocTypes.includes(prefix)) {
			return installments.map(inst => ({
				contractId,
				installmentId: inst.deudaId,
				period: '',
				amount: inst.amount,
				result: 'EXCLUDED_DOCUMENT',
				reason: `Document prefix '${prefix}' is excluded in configuration`,
			}))
		}
		return null
	}

	/**
	 * Step 4: Validates if the contract status is within the allowed importable statuses.
	 */
	static checkContractStatus(
		status: string,
		importableStatuses: readonly string[],
		contractId: number,
		installments: readonly ImportableInstallment[],
	): InstallmentEvaluationItem[] | null {
		if (!importableStatuses.includes(status)) {
			return installments.map(inst => ({
				contractId,
				installmentId: inst.deudaId,
				period: '',
				amount: inst.amount,
				result: 'EXCLUDED_STATUS',
				reason: `Contract status '${status}' is excluded by configuration`,
			}))
		}
		return null
	}

	/**
	 * Step 5: Checks for currency incoherence (< 1% of plan rate on non-residual amounts).
	 */
	static checkCurrencyCoherence(
		installments: readonly ImportableInstallment[],
		planPrice: number,
		contractId: number,
	): InstallmentEvaluationItem[] | null {
		const hasIncoherent = installments.some(inst => {
			const money = Money.fromDollars(inst.amount)
			if (money.cents <= 0) return false // Residuals handled separately
			return Money.isCurrencyIncoherent(inst.amount, planPrice)
		})

		if (hasIncoherent) {
			return installments.map(inst => ({
				contractId,
				installmentId: inst.deudaId,
				period: '',
				amount: inst.amount,
				result: 'INCOHERENT_CURRENCY',
				reason: `Installment debt is less than 1% of plan price (${inst.amount} vs ${planPrice})`,
			}))
		}
		return null
	}

	/**
	 * Step 6: Filters residual debts (< $0.01) and parses valid installment periods.
	 */
	static filterResidualDebts(
		installments: readonly ImportableInstallment[],
		contractId: number,
	): { valid: ParsedCandidate[]; items: InstallmentEvaluationItem[] } {
		const valid: ParsedCandidate[] = []
		const items: InstallmentEvaluationItem[] = []

		for (const inst of installments) {
			const money = Money.fromDollars(inst.amount)
			if (money.isResidual() || inst.amount < 0.01) {
				items.push({
					contractId,
					installmentId: inst.deudaId,
					period: '',
					amount: inst.amount,
					result: 'RESIDUAL_DEBT',
					reason: `Residual debt less than one cent (${inst.amount})`,
				})
				continue
			}

			try {
				const detailStr = inst.debtDetail[0] ?? ''
				const period = Period.fromDebtDetail(detailStr)
				valid.push({ inst, period, money })
			} catch {
				items.push({
					contractId,
					installmentId: inst.deudaId,
					period: '',
					amount: inst.amount,
					result: 'INVALID_DATA',
					reason: `Unable to parse period from debt detail: ${JSON.stringify(inst.debtDetail)}`,
				})
			}
		}

		return { valid, items }
	}

	/**
	 * Step 7: Sorts candidates chronologically by period.
	 */
	static sortChronologically(candidates: readonly ParsedCandidate[]): ParsedCandidate[] {
		return [...candidates].sort((a, b) => Period.compare(a.period, b.period))
	}

	/**
	 * Step 8: Applies the sliding month import window.
	 */
	static filterByWindow(
		candidates: readonly ParsedCandidate[],
		referencePeriod: string,
		windowMonths: number | null,
		contractId: number,
	): { withinWindow: ParsedCandidate[]; items: InstallmentEvaluationItem[] } {
		const withinWindow: ParsedCandidate[] = []
		const items: InstallmentEvaluationItem[] = []

		for (const item of candidates) {
			if (windowMonths !== null && !item.period.isWithinWindow(referencePeriod, windowMonths)) {
				items.push({
					contractId,
					installmentId: item.inst.deudaId,
					period: item.period.code,
					amount: item.money.dollars,
					result: 'OUTSIDE_WINDOW',
					reason: `Period ${item.period.code} outside ${windowMonths}-month window`,
				})
				continue
			}
			withinWindow.push(item)
		}

		return { withinWindow, items }
	}

	/**
	 * Step 9: Retains only the most recent N installments.
	 */
	static filterByRecentLimit(
		candidates: readonly ParsedCandidate[],
		maxRecent: number | null,
		contractId: number,
	): { kept: ParsedCandidate[]; items: InstallmentEvaluationItem[] } {
		if (maxRecent === null || candidates.length <= maxRecent) {
			return { kept: [...candidates], items: [] }
		}

		const cutoffIndex = candidates.length - maxRecent
		const discarded = candidates.slice(0, cutoffIndex)
		const kept = candidates.slice(cutoffIndex)

		const items: InstallmentEvaluationItem[] = discarded.map(older => ({
			contractId,
			installmentId: older.inst.deudaId,
			period: older.period.code,
			amount: older.money.dollars,
			result: 'MAX_RECENT_LIMIT',
			reason: `Exceeded max recent limit (${maxRecent}), older installment discarded`,
		}))

		return { kept, items }
	}

	/**
	 * Step 10: Constructs final CandidateInstallment objects with due and cutoff dates.
	 */
	static buildCandidates(
		candidates: readonly ParsedCandidate[],
		graceDays: number,
	): CandidateInstallment[] {
		return candidates.map(item => ({
			installmentId: item.inst.deudaId,
			period: item.period,
			money: item.money,
			dueDate: item.period.dueDate,
			cutoffDate: item.period.calculateCutoffDate(graceDays),
		}))
	}

	/**
	 * Global Pipeline: Composes the 10 steps sequentially to evaluate a contract.
	 */
	static evaluate(
		contract: ImportableContract,
		config: ConfigurationEntity,
		referencePeriod: string,
	): ContractEvaluation {
		const items: InstallmentEvaluationItem[] = []

		// 1. Zero debt check
		const zeroDebtItem = this.checkZeroDebt(contract)
		if (zeroDebtItem) {
			items.push(zeroDebtItem)
			return { isEligible: false, candidates: [], items }
		}

		// 2. Validate identification
		const idCheck = this.validateIdentification(
			contract.holderTaxId,
			contract.contractId,
			contract.installments,
		)
		if (!idCheck.identification || idCheck.errors) {
			items.push(...(idCheck.errors ?? []))
			return { isEligible: false, candidates: [], items }
		}

		// 3. Document type exclusion
		const docTypeErrors = this.checkDocumentType(
			idCheck.identification.prefix,
			config.excludedDocTypes,
			contract.contractId,
			contract.installments,
		)
		if (docTypeErrors) {
			items.push(...docTypeErrors)
			return { isEligible: false, candidates: [], items }
		}

		// 4. Contract status check
		const statusErrors = this.checkContractStatus(
			contract.status,
			config.importableStatuses,
			contract.contractId,
			contract.installments,
		)
		if (statusErrors) {
			items.push(...statusErrors)
			return { isEligible: false, candidates: [], items }
		}

		// 5. Currency coherence check
		const currencyErrors = this.checkCurrencyCoherence(
			contract.installments,
			contract.planPrice,
			contract.contractId,
		)
		if (currencyErrors) {
			items.push(...currencyErrors)
			return { isEligible: false, candidates: [], items }
		}

		// 6. Filter residual debts and parse periods
		const { valid, items: residualItems } = this.filterResidualDebts(
			contract.installments,
			contract.contractId,
		)
		items.push(...residualItems)

		// 7. Chronological sort
		const sorted = this.sortChronologically(valid)

		// 8. Import window filter
		const { withinWindow, items: windowItems } = this.filterByWindow(
			sorted,
			referencePeriod,
			config.importWindowMonths,
			contract.contractId,
		)
		items.push(...windowItems)

		// 9. Recent limit filter
		const { kept, items: recentItems } = this.filterByRecentLimit(
			withinWindow,
			config.maxRecentInstallments,
			contract.contractId,
		)
		items.push(...recentItems)

		// 10. Build candidate models
		const candidates = this.buildCandidates(kept, config.graceDays)

		return {
			isEligible: true,
			candidates,
			items,
		}
	}
}
