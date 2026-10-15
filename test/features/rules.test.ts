import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
	ContractStatusRule,
	DocumentTypeRule,
	CurrencyCoherenceRule,
	ResidualDebtFilter,
	ImportWindowFilter,
	RecentInstallmentsFilter,
} from '../../src/cobrix/features/import/domain/rules/index.ts'
import { ImportCapPolicy } from '../../src/cobrix/features/import/domain/services/import-cap.policy.ts'
import { Period } from '../../src/cobrix/shared/domain/period.vo.ts'

describe('Domain Rules & Policies (Isolated Unit Specifications §3.1 & §4)', () => {
	describe('ContractStatusRule', () => {
		it('returns true when status is in importable list', () => {
			assert.equal(ContractStatusRule.isSatisfied('ACTIVO', ['ACTIVO', 'CORTADO']), true)
			assert.equal(ContractStatusRule.isSatisfied('CORTADO', ['ACTIVO', 'CORTADO']), true)
		})

		it('returns false when status is excluded (CORTESIA, CANCELADO, etc.)', () => {
			assert.equal(ContractStatusRule.isSatisfied('CORTESIA', ['ACTIVO', 'CORTADO']), false)
			assert.equal(ContractStatusRule.isSatisfied('CANCELADO', ['ACTIVO', 'CORTADO']), false)
			assert.equal(ContractStatusRule.isSatisfied('RETIRADO', ['ACTIVO', 'CORTADO']), false)
			assert.equal(ContractStatusRule.isSatisfied('ANULADO', ['ACTIVO', 'CORTADO']), false)
		})
	})

	describe('DocumentTypeRule', () => {
		it('identifies excluded prefix according to configuration', () => {
			assert.equal(DocumentTypeRule.isExcluded('J', ['J', 'G']), true)
			assert.equal(DocumentTypeRule.isExcluded('V', ['J', 'G']), false)
			assert.equal(DocumentTypeRule.isExcluded(null, ['J']), false)
		})
	})

	describe('CurrencyCoherenceRule', () => {
		it('detects incoherent debt when amount is less than 1% of plan rate', () => {
			assert.equal(CurrencyCoherenceRule.isCoherent(0.05, 20), false) // 0.25% < 1%
			assert.equal(CurrencyCoherenceRule.isCoherent(0.20, 20), true)  // 1% exactly
			assert.equal(CurrencyCoherenceRule.isCoherent(25.0, 25), true)
		})

		it('ignores residual amounts (< 1 cent) in currency check', () => {
			assert.equal(CurrencyCoherenceRule.isCoherent(0.001317, 25), true)
		})

		it('detects incoherent contract with installments array', () => {
			const installments = [{ amount: 20 }, { amount: 0.05 }]
			assert.equal(CurrencyCoherenceRule.hasIncoherentInstallment(installments, 20), true)
		})
	})

	describe('ResidualDebtFilter', () => {
		it('flags amounts under 1 cent as residual debt', () => {
			assert.equal(ResidualDebtFilter.isResidual(0.001317), true)
			assert.equal(ResidualDebtFilter.isResidual(0.009), true)
			assert.equal(ResidualDebtFilter.isResidual(0.0), true)
			assert.equal(ResidualDebtFilter.isResidual(-5), true)
			assert.equal(ResidualDebtFilter.isResidual(0.01), false)
			assert.equal(ResidualDebtFilter.isResidual(15.5), false)
		})
	})

	describe('ImportWindowFilter', () => {
		it('allows any period when windowMonths is null', () => {
			const period = Period.fromCode('2024-01')
			assert.equal(ImportWindowFilter.isWithinWindow(period, '2026-10', null), true)
		})

		it('evaluates sliding month window correctly', () => {
			const p1 = Period.fromCode('2026-10')
			const p2 = Period.fromCode('2026-08')
			const p3 = Period.fromCode('2026-05')

			assert.equal(ImportWindowFilter.isWithinWindow(p1, '2026-10', 3), true)
			assert.equal(ImportWindowFilter.isWithinWindow(p2, '2026-10', 3), true)
			assert.equal(ImportWindowFilter.isWithinWindow(p3, '2026-10', 3), false)
		})
	})

	describe('RecentInstallmentsFilter', () => {
		it('keeps all items when maxRecent is null or greater than list length', () => {
			const items = ['a', 'b', 'c']
			const slice = RecentInstallmentsFilter.slice(items, null)
			assert.deepEqual(slice.kept, items)
			assert.deepEqual(slice.discarded, [])
		})

		it('slices to retain only the most recent N items', () => {
			const items = ['mayo', 'junio', 'julio']
			const slice = RecentInstallmentsFilter.slice(items, 1)
			assert.deepEqual(slice.kept, ['julio'])
			assert.deepEqual(slice.discarded, ['mayo', 'junio'])
		})
	})

	describe('ImportCapPolicy', () => {
		it('allows import when limits are not exceeded', () => {
			const res = ImportCapPolicy.canImport(0, 0, 2500, 10, 500)
			assert.equal(res.allowed, true)
		})

		it('stops import when maxNewInvoices is reached', () => {
			const res = ImportCapPolicy.canImport(10, 50000, 2500, 10, null)
			assert.equal(res.allowed, false)
			assert.match(res.reason ?? '', /max new invoices cap/)
		})

		it('stops import when maxNewAmount is exceeded', () => {
			const res = ImportCapPolicy.canImport(2, 9000, 2000, null, 100)
			assert.equal(res.allowed, false)
			assert.match(res.reason ?? '', /max new amount cap/)
		})
	})
})
