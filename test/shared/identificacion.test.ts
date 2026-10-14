import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Identificacion } from '../../src/shared/domain/identificacion.vo.ts'

describe('Value Object: Identificacion (Reglas §4 y §5)', () => {
	it('normaliza cédulas con letra y guiones (V-12345678 -> V12345678)', () => {
		const id = Identificacion.crear('V-12345678')
		assert.equal(id.valor, 'V12345678')
		assert.equal(id.tipoPersona, 'NATURAL')
	})

	it('normaliza identificaciones sin letra y remueve ceros a la izquierda (09000123 -> 9000123)', () => {
		const id = Identificacion.crear('09000123')
		assert.equal(id.valor, '9000123')
		assert.equal(id.tipoPersona, 'NATURAL')
	})

	it('normaliza RIF jurídico con guiones intermedios (J-40123456-7 -> J401234567)', () => {
		const id = Identificacion.crear('J-40123456-7')
		assert.equal(id.valor, 'J401234567')
		assert.equal(id.tipoPersona, 'JURIDICO')
	})

	it('clasifica G como persona jurídica y E/P como naturales', () => {
		const idG = Identificacion.crear('G-20000000-1')
		assert.equal(idG.tipoPersona, 'JURIDICO')

		const idE = Identificacion.crear('E-81234567')
		assert.equal(idE.tipoPersona, 'NATURAL')

		const idP = Identificacion.crear('P-1234567')
		assert.equal(idP.tipoPersona, 'NATURAL')
	})

	it('rechaza identificaciones con menos de 6 dígitos', () => {
		assert.throws(() => Identificacion.crear('V-12345'), /identificación inválida/i)
	})

	it('rechaza identificaciones con más de 12 dígitos', () => {
		assert.throws(() => Identificacion.crear('V-1234567890123'), /identificación inválida/i)
	})

	it('rechaza letras no permitidas (ej. X, Z)', () => {
		assert.throws(() => Identificacion.crear('X-12345678'), /identificación inválida/i)
		assert.throws(() => Identificacion.crear('Z-98765432'), /identificación inválida/i)
	})

	it('rechaza cadenas vacías o con formato corrupto', () => {
		assert.throws(() => Identificacion.crear(''), /identificación inválida/i)
		assert.throws(() => Identificacion.crear('ABC---'), /identificación inválida/i)
	})
})
