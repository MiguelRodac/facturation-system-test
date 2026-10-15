/**
 * Value Object: Money
 *
 * Business Rules (docs/ENUNCIADO.md §4):
 * - Installments with debt 0 (residual balance of less than one cent) are not imported.
 * - Only contracts in coherent USD are imported. Contracts reported by the API in USD
 *   with amounts lower than 1% of the plan price are discarded as currency-incoherent.
 */

export class Money {
	readonly cents: number
	readonly currency: string

	private constructor(cents: number, currency = 'USD') {
		this.cents = Math.round(cents)
		this.currency = currency.toUpperCase()
	}

	static fromCents(cents: number, currency = 'USD'): Money {
		return new Money(cents, currency)
	}

	static fromDecimal(amount: number, currency = 'USD'): Money {
		if (typeof amount !== 'number' || isNaN(amount)) {
			throw new Error(`Invalid amount: ${amount}`)
		}
		return new Money(Math.round(amount * 100), currency)
	}

	static fromDollars(dollars: number, currency = 'USD'): Money {
		return Money.fromDecimal(dollars, currency)
	}

	get amount(): number {
		return this.cents / 100
	}

	get dollars(): number {
		return this.cents / 100
	}

	static isCurrencyIncoherent(installmentAmount: number, planPrice: number): boolean {
		if (planPrice <= 0) return false
		return installmentAmount < planPrice * 0.01
	}

	/**
	 * Residual balance of less than 1 cent (amount <= 0 after rounding).
	 * Enunciado §4: "Una cuota con deuda 0 (saldo residual de menos de un centavo) no se importa."
	 */
	isResidual(): boolean {
		return this.cents <= 0
	}

	/**
	 * Currency coherence check (Enunciado §4):
	 * Returns false if the installment amount is less than 1% of the plan's rate.
	 */
	isCurrencyCoherent(planPrice: Money): boolean {
		if (planPrice.cents <= 0) return true
		const onePercentThreshold = planPrice.cents * 0.01
		return this.cents >= onePercentThreshold
	}

	add(other: Money): Money {
		this.assertSameCurrency(other)
		return new Money(this.cents + other.cents, this.currency)
	}

	subtract(other: Money): Money {
		this.assertSameCurrency(other)
		return new Money(this.cents - other.cents, this.currency)
	}

	compare(other: Money): number {
		this.assertSameCurrency(other)
		return this.cents - other.cents
	}

	equals(other: Money): boolean {
		return this.cents === other.cents && this.currency === other.currency
	}

	private assertSameCurrency(other: Money): void {
		if (this.currency !== other.currency) {
			throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`)
		}
	}
}
