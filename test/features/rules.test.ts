import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
	ImportEvaluatorService,
	type ParsedCandidate,
} from '../../src/cobrix/features/import/domain/import-evaluator.service.ts'
import { ImportCapPolicy } from '../../src/cobrix/features/import/domain/import-cap.policy.ts'
import type { ImportableContract } from '../../src/cobrix/features/import/domain/billing-api.port.ts'
import { Money } from '../../src/cobrix/shared/domain/money.vo.ts'
import { Period } from '../../src/cobrix/shared/domain/period.vo.ts'

describe('Domain Service: Granular Step Methods (§3.1, §4, §5)', () => {
	const baseContract: ImportableContract = {
		contractId: 900101,
		code: 'CON-001',
		holderTaxId: 'V-12345678',
		holderName: 'ANA PEREZ',
		phone: '04141234567',
		email: 'ana@example.com',
		address: 'Caracas',
		status: 'ACTIVO',
		planName: 'PLAN15MB25',
		planPrice: 25,
		branchName: 'Sucursal 1',
		installments: [
			{ deudaId: '7000008', amount: 20, status: 'EMI', debtDetail: ['PLAN15MB25 - 2026 Agosto'] },
		],
	}

	it('Step 1: checkZeroDebt detects empty installments', () => {
		const emptyContract: ImportableContract = { ...baseContract, installments: [] }
		const item = ImportEvaluatorService.checkZeroDebt(emptyContract)
		assert.ok(item)
		assert.equal(item.result, 'NO_DEBT')

		const nonZero = ImportEvaluatorService.checkZeroDebt(baseContract)
		assert.equal(nonZero, null)
	})

	it('Step 2: validateIdentification handles valid and invalid tax IDs', () => {
		const valid = ImportEvaluatorService.validateIdentification('V-12345678', 900101, baseContract.installments)
		assert.ok(valid.identification)
		assert.equal(valid.identification.normalized, 'V12345678')
		assert.equal(valid.errors, undefined)

		const invalid = ImportEvaluatorService.validateIdentification('INVALID-XYZ', 900101, baseContract.installments)
		assert.equal(invalid.identification, undefined)
		assert.ok(invalid.errors)
		assert.equal(invalid.errors[0]?.result, 'INVALID_DATA')
	})

	it('Step 3: checkDocumentType identifies excluded prefixes', () => {
		const excluded = ImportEvaluatorService.checkDocumentType('J', ['J', 'G'], 900101, baseContract.installments)
		assert.ok(excluded)
		assert.equal(excluded[0]?.result, 'EXCLUDED_DOCUMENT')

		const allowed = ImportEvaluatorService.checkDocumentType('V', ['J', 'G'], 900101, baseContract.installments)
		assert.equal(allowed, null)
	})

	it('Step 4: checkContractStatus validates contract status against importable list', () => {
		const allowed = ImportEvaluatorService.checkContractStatus('ACTIVO', ['ACTIVO', 'CORTADO'], 900101, baseContract.installments)
		assert.equal(allowed, null)

		const excluded = ImportEvaluatorService.checkContractStatus('CORTESIA', ['ACTIVO', 'CORTADO'], 900101, baseContract.installments)
		assert.ok(excluded)
		assert.equal(excluded[0]?.result, 'EXCLUDED_STATUS')
	})

	it('Step 5: checkCurrencyCoherence catches debts under 1% of plan price', () => {
		const corruptInstallments = [{ deudaId: '7000010', amount: 0.05, status: 'EMI', debtDetail: ['PLAN20 - 2026 Agosto'] }]
		const incoherent = ImportEvaluatorService.checkCurrencyCoherence(corruptInstallments, 20, 900101)
		assert.ok(incoherent)
		assert.equal(incoherent[0]?.result, 'INCOHERENT_CURRENCY')

		const coherent = ImportEvaluatorService.checkCurrencyCoherence(baseContract.installments, 25, 900101)
		assert.equal(coherent, null)
	})

	it('Step 6: filterResidualDebts separates residual balances and parses valid periods', () => {
		const mixedInstallments = [
			{ deudaId: '1', amount: 0.001317, status: 'EMI', debtDetail: ['PLAN - 2026 Agosto'] },
			{ deudaId: '2', amount: 25.0, status: 'EMI', debtDetail: ['PLAN - 2026 Septiembre'] },
		]
		const res = ImportEvaluatorService.filterResidualDebts(mixedInstallments, 900101)
		assert.equal(res.valid.length, 1)
		assert.equal(res.valid[0]?.inst.deudaId, '2')
		assert.equal(res.items.length, 1)
		assert.equal(res.items[0]?.result, 'RESIDUAL_DEBT')
	})

	it('Step 7: sortChronologically sorts candidates by period', () => {
		const c1: ParsedCandidate = {
			inst: { deudaId: '1', amount: 25, status: 'EMI', debtDetail: [] },
			period: Period.fromCode('2026-09'),
			money: Money.fromDollars(25),
		}
		const c2: ParsedCandidate = {
			inst: { deudaId: '2', amount: 25, status: 'EMI', debtDetail: [] },
			period: Period.fromCode('2026-08'),
			money: Money.fromDollars(25),
		}
		const sorted = ImportEvaluatorService.sortChronologically([c1, c2])
		assert.equal(sorted[0]?.period.code, '2026-08')
		assert.equal(sorted[1]?.period.code, '2026-09')
	})

	it('Step 8: filterByWindow drops installments older than the sliding window', () => {
		const c1: ParsedCandidate = {
			inst: { deudaId: '1', amount: 25, status: 'EMI', debtDetail: [] },
			period: Period.fromCode('2026-05'),
			money: Money.fromDollars(25),
		}
		const c2: ParsedCandidate = {
			inst: { deudaId: '2', amount: 25, status: 'EMI', debtDetail: [] },
			period: Period.fromCode('2026-09'),
			money: Money.fromDollars(25),
		}
		const res = ImportEvaluatorService.filterByWindow([c1, c2], '2026-10', 3, 900101)
		assert.equal(res.withinWindow.length, 1)
		assert.equal(res.withinWindow[0]?.period.code, '2026-09')
		assert.equal(res.items.length, 1)
		assert.equal(res.items[0]?.result, 'OUTSIDE_WINDOW')
	})

	it('Step 9: filterByRecentLimit retains only the N most recent installments', () => {
		const c1: ParsedCandidate = {
			inst: { deudaId: '1', amount: 25, status: 'EMI', debtDetail: [] },
			period: Period.fromCode('2026-07'),
			money: Money.fromDollars(25),
		}
		const c2: ParsedCandidate = {
			inst: { deudaId: '2', amount: 25, status: 'EMI', debtDetail: [] },
			period: Period.fromCode('2026-08'),
			money: Money.fromDollars(25),
		}
		const res = ImportEvaluatorService.filterByRecentLimit([c1, c2], 1, 900101)
		assert.equal(res.kept.length, 1)
		assert.equal(res.kept[0]?.period.code, '2026-08')
		assert.equal(res.items.length, 1)
		assert.equal(res.items[0]?.result, 'MAX_RECENT_LIMIT')
	})

	it('Step 10: buildCandidates generates due and cutoff dates', () => {
		const candidate: ParsedCandidate = {
			inst: { deudaId: '7000008', amount: 25, status: 'EMI', debtDetail: [] },
			period: Period.fromCode('2026-08'),
			money: Money.fromDollars(25),
		}
		const built = ImportEvaluatorService.buildCandidates([candidate], 5)
		assert.equal(built.length, 1)
		assert.equal(built[0]?.dueDate, '2026-08-01')
		assert.equal(built[0]?.cutoffDate, '2026-08-06')
	})

	it('ImportCapPolicy enforces max new invoices and max new amount caps', () => {
		assert.equal(ImportCapPolicy.canImport(0, 0, 2500, 10, 500).allowed, true)
		assert.equal(ImportCapPolicy.canImport(10, 50000, 2500, 10, null).allowed, false)
		assert.equal(ImportCapPolicy.canImport(2, 9000, 2000, null, 100).allowed, false)
	})
})
