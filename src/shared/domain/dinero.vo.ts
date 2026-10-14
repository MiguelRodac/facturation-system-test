/**
 * Value Object: Dinero
 *
 * Reglas de negocio (docs/ENUNCIADO.md §4):
 * - Una cuota con deuda 0 (saldo residual de menos de un centavo) no se importa.
 * - Solo se importan contratos en USD coherente. Un contrato que la API reporta en USD
 *   pero con cuotas absurdamente bajas frente al precio del plan (menos del 1 %)
 *   se descarta por moneda incoherente.
 */

export class Dinero {
	readonly centavos: number
	readonly moneda: string

	private constructor(centavos: number, moneda = 'USD') {
		this.centavos = Math.round(centavos)
		this.moneda = moneda.toUpperCase()
	}

	static desdeCentavos(centavos: number, moneda = 'USD'): Dinero {
		return new Dinero(centavos, moneda)
	}

	static desdeDecimal(monto: number, moneda = 'USD'): Dinero {
		if (typeof monto !== 'number' || isNaN(monto)) {
			throw new Error(`Monto inválido: ${monto}`)
		}
		return new Dinero(Math.round(monto * 100), moneda)
	}

	get monto(): number {
		return this.centavos / 100
	}

	/**
	 * Saldo residual menor a 1 centavo de dólar (deuda <= 0 tras redondeo a centavos).
	 * Enunciado §4: "Una cuota con deuda 0 (saldo residual de menos de un centavo) no se importa."
	 */
	esResidual(): boolean {
		return this.centavos <= 0
	}

	/**
	 * Regla de coherencia monetaria (§4):
	 * Si la cuota reportada en USD es menor al 1% de la tarifa del plan, la moneda es incoherente.
	 */
	esMonedaCoherente(precioPlan: Dinero): boolean {
		if (precioPlan.centavos <= 0) return true
		const umbralUnPorCiento = precioPlan.centavos * 0.01
		return this.centavos >= umbralUnPorCiento
	}

	sumar(otro: Dinero): Dinero {
		this.asegurarMismaMoneda(otro)
		return new Dinero(this.centavos + otro.centavos, this.moneda)
	}

	restar(otro: Dinero): Dinero {
		this.asegurarMismaMoneda(otro)
		return new Dinero(this.centavos - otro.centavos, this.moneda)
	}

	comparar(otro: Dinero): number {
		this.asegurarMismaMoneda(otro)
		return this.centavos - otro.centavos
	}

	equals(otro: Dinero): boolean {
		return this.centavos === otro.centavos && this.moneda === otro.moneda
	}

	private asegurarMismaMoneda(otro: Dinero): void {
		if (this.moneda !== otro.moneda) {
			throw new Error(`Monedas incompatibles: ${this.moneda} vs ${otro.moneda}`)
		}
	}
}
