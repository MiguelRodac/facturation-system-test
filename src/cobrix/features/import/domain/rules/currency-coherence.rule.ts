/**
 * Currency Coherence Rule (docs/ENUNCIADO.md §4 line 127)
 *
 * Excludes contracts whose debt is incoherently small compared to the plan rate
 * (< 1% of plan rate, indicative of data entry currency corruption like Jorge Castillo).
 *
 * NOTE: Non-residual debts (> 0 rounded cents) only are evaluated here.
 */

import { Money } from '../../../../shared/domain/money.vo.ts'

export class CurrencyCoherenceRule {
	static isCoherent(installmentAmount: number, planPrice: number): boolean {
		const money = Money.fromDollars(installmentAmount)
		if (money.cents <= 0) return true
		return !Money.isCurrencyIncoherent(installmentAmount, planPrice)
	}

	static hasIncoherentInstallment(
		installments: readonly { readonly amount: number }[],
		planPrice: number,
	): boolean {
		return installments.some(inst => !this.isCoherent(inst.amount, planPrice))
	}
}
