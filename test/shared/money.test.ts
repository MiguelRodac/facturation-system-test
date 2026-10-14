import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Money } from '../../src/cobrix/shared/domain/money.vo.ts'

describe('Value Object: Money (Business Rules §4 & §5)', () => {
	it('creates money instances with exact integer cents precision', () => {
		const m1 = Money.fromDecimal(25)
		assert.equal(m1.cents, 2500)
		assert.equal(m1.amount, 25)

		const m2 = Money.fromDecimal(0.05)
		assert.equal(m2.cents, 5)
		assert.equal(m2.amount, 0.05)
	})

	it('detects residual amounts less than 1 cent (Sofia Torres case: 0.001317 -> 0 cents)', () => {
		const residual = Money.fromDecimal(0.001317)
		assert.equal(residual.cents, 0)
		assert.equal(residual.isResidual(), true)

		const normal = Money.fromDecimal(20.00)
		assert.equal(normal.isResidual(), false)
	})

	it('detects currency incoherence when installment is less than 1% of plan rate (Jorge Castillo case)', () => {
		// Jorge Castillo: $20 USD plan with $0.05 USD installment (0.25% < 1%)
		const incoherentInstallment = Money.fromDecimal(0.05)
		const planPrice = Money.fromDecimal(20.00)

		assert.equal(incoherentInstallment.isCurrencyCoherent(planPrice), false)
	})

	it('validates currency coherence when installment is >= 1% of plan rate', () => {
		const planPrice = Money.fromDecimal(25.00) // 1% = 0.25 USD

		const normalInstallment = Money.fromDecimal(20.00)
		assert.equal(normalInstallment.isCurrencyCoherent(planPrice), true)

		const boundaryInstallment = Money.fromDecimal(0.25)
		assert.equal(boundaryInstallment.isCurrencyCoherent(planPrice), true)
	})

	it('supports immutable addition and subtraction', () => {
		const a = Money.fromDecimal(10.25)
		const b = Money.fromDecimal(5.50)
		const sum = a.add(b)
		const diff = a.subtract(b)

		assert.equal(sum.amount, 15.75)
		assert.equal(diff.amount, 4.75)
	})
})
