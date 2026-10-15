/**
 * Import Evaluator Domain Service (docs/ENUNCIADO.md §3.1, §4, §5)
 *
 * Composes domain rules to evaluate eligibility of contracts and their installments:
 * - Empty debt check (deuda_id === "0")
 * - Identification parsing and validation
 * - Document type exclusion (DocumentTypeRule)
 * - Contract status filtering (ContractStatusRule)
 * - Currency coherence calculation (CurrencyCoherenceRule)
 * - Residual debt filtering (ResidualDebtFilter)
 * - Period extraction and chronological sorting (Period VO)
 * - Import window filtering (ImportWindowFilter)
 * - Recent installments limit (RecentInstallmentsFilter)
 */

import { Identification } from '../../../../shared/domain/identification.vo.ts'
import { Money } from '../../../../shared/domain/money.vo.ts'
import { Period } from '../../../../shared/domain/period.vo.ts'
import type { ConfigurationEntity } from '../../../configuration/domain/configuration.entity.ts'
import type { ImportableContract, ImportableInstallment } from '../ports/billing-api.port.ts'
import type {
	CandidateInstallment,
	ContractEvaluation,
	InstallmentEvaluationItem,
} from '../import.types.ts'
import {
	ContractStatusRule,
	CurrencyCoherenceRule,
	DocumentTypeRule,
	ImportWindowFilter,
	RecentInstallmentsFilter,
	ResidualDebtFilter,
} from '../rules/index.ts'

interface ParsedCandidate {
	readonly inst: ImportableInstallment
	readonly period: Period
	readonly money: Money
}

export class ImportEvaluatorService {
	static evaluate(
		contract: ImportableContract,
		config: ConfigurationEntity,
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
		if (DocumentTypeRule.isExcluded(identification.prefix, config.excludedDocTypes)) {
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
		if (!ContractStatusRule.isSatisfied(contract.status, config.importableStatuses)) {
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

		// 5. Currency coherence verification (< 1% of plan rate)
		if (CurrencyCoherenceRule.hasIncoherentInstallment(contract.installments, contract.planPrice)) {
			for (const inst of contract.installments) {
				items.push({
					contractId: contract.contractId,
					installmentId: inst.deudaId,
					period: '',
					amount: inst.amount,
					result: 'INCOHERENT_CURRENCY',
					reason: `Installment debt is less than 1% of plan price (${inst.amount} vs ${contract.planPrice})`,
				})
			}
			return { isEligible: false, candidates: [], items }
		}

		// 6. Filter residual debts and extract periods
		const parsedList: ParsedCandidate[] = []
		for (const inst of contract.installments) {
			if (ResidualDebtFilter.isResidual(inst.amount)) {
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

			parsedList.push({
				inst,
				period,
				money: Money.fromDollars(inst.amount),
			})
		}

		// 7. Sort chronologically by period (API delivers in scrambled order)
		parsedList.sort((a, b) => Period.compare(a.period, b.period))

		// 8. Apply import window
		const withinWindowList: ParsedCandidate[] = []
		for (const item of parsedList) {
			if (!ImportWindowFilter.isWithinWindow(item.period, referencePeriod, config.importWindowMonths)) {
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
			withinWindowList.push(item)
		}

		// 9. Apply max recent limit
		const slice = RecentInstallmentsFilter.slice(withinWindowList, config.maxRecentInstallments)
		for (const older of slice.discarded) {
			items.push({
				contractId: contract.contractId,
				installmentId: older.inst.deudaId,
				period: older.period.code,
				amount: older.money.dollars,
				result: 'MAX_RECENT_LIMIT',
				reason: `Exceeded max recent limit (${config.maxRecentInstallments}), older installment discarded`,
			})
		}

		// 10. Build candidate installment objects
		const candidates: CandidateInstallment[] = slice.kept.map(item => ({
			installmentId: item.inst.deudaId,
			period: item.period,
			money: item.money,
			dueDate: item.period.dueDate,
			cutoffDate: item.period.calculateCutoffDate(config.graceDays),
		}))

		return {
			isEligible: true,
			candidates,
			items,
		}
	}
}
