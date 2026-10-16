/**
 * Import Feature Domain Types (docs/ENUNCIADO.md §3.1, §3.2, §4)
 */

import type { Money } from '../../../shared/domain/money.vo.ts'
import type { Period } from '../../../shared/domain/period.vo.ts'
import type { ConfigurationEntity } from '../../configuration/domain/configuration.entity.ts'

export type EvaluationResult =
	| 'IMPORTED'
	| 'ALREADY_IMPORTED'
	| 'NO_DEBT'
	| 'EXCLUDED_STATUS'
	| 'EXCLUDED_DOCUMENT'
	| 'INCOHERENT_CURRENCY'
	| 'RESIDUAL_DEBT'
	| 'OUTSIDE_WINDOW'
	| 'MAX_RECENT_LIMIT'
	| 'STOPPED_BY_CAP'
	| 'INVALID_DATA'

export interface InstallmentEvaluationItem {
	readonly contractId: number
	readonly installmentId: string
	readonly period: string
	readonly amount: number
	readonly result: EvaluationResult
	readonly reason?: string
}

export interface CandidateInstallment {
	readonly installmentId: string
	readonly period: Period
	readonly money: Money
	readonly dueDate: string
	readonly cutoffDate: string
}

export interface ContractEvaluation {
	readonly isEligible: boolean
	readonly candidates: readonly CandidateInstallment[]
	readonly items: readonly InstallmentEvaluationItem[]
}

export interface ImportSummary {
	readonly totalContractsChecked: number
	readonly totalInstallmentsChecked: number
	readonly importedInvoicesCount: number
	readonly importedAmount: number
	readonly importedCustomersCount: number
	readonly items: readonly InstallmentEvaluationItem[]
	readonly isSimulation: boolean
	readonly runId?: number
}

export interface ImportOptions {
	readonly isSimulation?: boolean
	readonly configOverride?: Partial<ConfigurationEntity>
	readonly referenceDate?: Date
}
