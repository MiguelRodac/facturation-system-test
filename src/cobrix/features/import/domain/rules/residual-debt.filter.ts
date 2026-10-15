/**
 * Residual Debt Filter (docs/ENUNCIADO.md §4 line 125)
 *
 * Filters out balances less than 1 cent ($0.01 / <= 0 integer cents) as accounting noise.
 */

import { Money } from '../../../../shared/domain/money.vo.ts'

export class ResidualDebtFilter {
	static isResidual(amount: number): boolean {
		const money = Money.fromDollars(amount)
		return money.isResidual() || amount < 0.01
	}
}
