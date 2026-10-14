import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Dinero } from '../../src/shared/domain/dinero.vo.ts'

describe('Value Object: Dinero (Reglas §4 y §5)', () => {
	it('crea montos con precisión exacta en centavos evitando errores de punto flotante', () => {
		const d1 = Dinero.desdeDecimal(25)
		assert.equal(d1.centavos, 2500)
		assert.equal(d1.monto, 25)

		const d2 = Dinero.desdeDecimal(0.05)
		assert.equal(d2.centavos, 5)
		assert.equal(d2.monto, 0.05)
	})

	it('detecta saldos residuales menores a un centavo (caso Sofia Torres: 0.001317 -> 0 centavos)', () => {
		const residual = Dinero.desdeDecimal(0.001317)
		assert.equal(residual.centavos, 0)
		assert.equal(residual.esResidual(), true)

		const normal = Dinero.desdeDecimal(20.00)
		assert.equal(normal.esResidual(), false)
	})

	it('detecta moneda incoherente cuando la cuota es menor al 1% del precio del plan (caso Jorge Castillo)', () => {
		// Jorge Castillo: Plan de $20 USD con cuotas reportadas en $0.05 USD (0.25% del plan < 1%)
		const cuotaIncoherente = Dinero.desdeDecimal(0.05)
		const precioPlan = Dinero.desdeDecimal(20.00)

		assert.equal(cuotaIncoherente.esMonedaCoherente(precioPlan), false)
	})

	it('valida como coherente una cuota igual o superior al 1% del precio del plan', () => {
		const precioPlan = Dinero.desdeDecimal(25.00) // 1% = 0.25 USD

		// Cuota normal completa de 20 USD o 25 USD
		const cuotaNormal = Dinero.desdeDecimal(20.00)
		assert.equal(cuotaNormal.esMonedaCoherente(precioPlan), true)

		// Cuota justo en el 1% (0.25 USD)
		const cuotaLimite = Dinero.desdeDecimal(0.25)
		assert.equal(cuotaLimite.esMonedaCoherente(precioPlan), true)
	})

	it('permite sumar y restar inmutablemente con precisión de centavos', () => {
		const a = Dinero.desdeDecimal(10.25)
		const b = Dinero.desdeDecimal(5.50)
		const suma = a.sumar(b)
		const resta = a.restar(b)

		assert.equal(suma.monto, 15.75)
		assert.equal(resta.monto, 4.75)
	})
})
