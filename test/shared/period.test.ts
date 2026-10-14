import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { Period } from '../../src/shared/domain/period.vo.ts'

describe('Value Object: Period (Business Rules §3.1 & §4)', () => {
	it('parses period and due date from installment debt detail string (e.g. "PLAN15MB25 - 2026 Agosto")', () => {
		const period = Period.fromDebtDetail('PLAN15MB25 - 2026 Agosto')
		assert.equal(period.value, '2026-08')
		assert.equal(period.dueDate, '2026-08-01')
	})

	it('parses period directly from YYYY-MM format', () => {
		const period = Period.fromPeriod('2026-09')
		assert.equal(period.value, '2026-09')
		assert.equal(period.dueDate, '2026-09-01')
	})

	it('calculates cutoff date adding grace days to due date (§4 line 126)', () => {
		const period = Period.fromPeriod('2026-08')
		// Due date 2026-08-01 + 5 grace days = 2026-08-06
		assert.equal(period.calculateCutoffDate(5), '2026-08-06')
		// Due date 2026-08-01 + 0 grace days = 2026-08-01
		assert.equal(period.calculateCutoffDate(0), '2026-08-01')
		// Due date 2026-08-01 + 31 grace days = 2026-09-01
		assert.equal(period.calculateCutoffDate(31), '2026-09-01')
	})

	it('evaluates import window (current month minus N months, §3.1 line 45)', () => {
		const current = '2026-10'
		const periodJuly = Period.fromPeriod('2026-07')
		const periodJune = Period.fromPeriod('2026-06')
		const periodOctober = Period.fromPeriod('2026-10')

		// 3-month window from 2026-10 includes: 2026-07, 2026-08, 2026-09, 2026-10
		assert.equal(periodJuly.isWithinWindow(current, 3), true)
		assert.equal(periodOctober.isWithinWindow(current, 3), true)
		assert.equal(periodJune.isWithinWindow(current, 3), false)

		// Without window (null or undefined) -> all periods are valid
		assert.equal(periodJune.isWithinWindow(current, null), true)
	})

	it('compares periods chronologically', () => {
		const p1 = Period.fromPeriod('2026-07')
		const p2 = Period.fromPeriod('2026-08')

		assert.ok(p1.isBefore(p2))
		assert.ok(p2.isAfter(p1))
		assert.equal(p1.compareTo(p2) < 0, true)
	})

	it('rejects unrecognized debt detail strings', () => {
		assert.throws(() => Period.fromDebtDetail('DETALLE SIN FECHA'), /invalid period/i)
	})
})
