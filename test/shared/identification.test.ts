import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Identification } from '../../src/cobrix/shared/domain/identification.vo.ts'

describe('Value Object: Identification (Business Rules §4 & §5)', () => {
	it('normalizes identification with prefix letter and dashes (V-12345678 -> V12345678)', () => {
		const id = Identification.create('V-12345678')
		assert.equal(id.value, 'V12345678')
		assert.equal(id.personType, 'NATURAL')
	})

	it('normalizes identification without letter and removes leading zeros (09000123 -> 9000123)', () => {
		const id = Identification.create('09000123')
		assert.equal(id.value, '9000123')
		assert.equal(id.personType, 'NATURAL')
	})

	it('normalizes legal entity RIF with dashes (J-40123456-7 -> J401234567)', () => {
		const id = Identification.create('J-40123456-7')
		assert.equal(id.value, 'J401234567')
		assert.equal(id.personType, 'LEGAL')
	})

	it('classifies G as legal entity and E/P as natural persons', () => {
		const idG = Identification.create('G-20000000-1')
		assert.equal(idG.personType, 'LEGAL')

		const idE = Identification.create('E-81234567')
		assert.equal(idE.personType, 'NATURAL')

		const idP = Identification.create('P-1234567')
		assert.equal(idP.personType, 'NATURAL')
	})

	it('rejects identifications with less than 6 digits', () => {
		assert.throws(() => Identification.create('V-12345'), /invalid identification/i)
	})

	it('rejects identifications with more than 12 digits', () => {
		assert.throws(() => Identification.create('V-1234567890123'), /invalid identification/i)
	})

	it('rejects invalid prefix letters (e.g., X, Z)', () => {
		assert.throws(() => Identification.create('X-12345678'), /invalid identification/i)
		assert.throws(() => Identification.create('Z-98765432'), /invalid identification/i)
	})

	it('rejects empty or corrupt strings', () => {
		assert.throws(() => Identification.create(''), /invalid identification/i)
		assert.throws(() => Identification.create('ABC---'), /invalid identification/i)
	})
})
