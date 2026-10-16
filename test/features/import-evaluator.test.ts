import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ConfigurationEntity } from '../../src/cobrix/features/configuration/index.ts'
import {
	ImportEvaluatorService,
	type ImportableContract,
} from '../../src/cobrix/features/import/index.ts'

describe('Domain Service: ImportEvaluatorService (Pure Business Rules Pipeline §3.1 & §4)', () => {
	const testConfig: ConfigurationEntity = {
		id: 1,
		companyName: 'Test Company',
		companyTaxId: 'J-12345678-0',
		billingEmail: 'billing@test.com',
		apiUrl: 'http://127.0.0.1:4310',
		apiUser: 'cobrix',
		apiPassword: 'password',
		importableStatuses: ['ACTIVO', 'CORTADO'],
		graceDays: 0,
		importWindowMonths: null,
		maxRecentInstallments: null,
		maxNewInvoices: null,
		maxNewAmount: null,
		excludedDocTypes: [],
		currencyMinRatio: 0.01,
		residualThresholdCents: 1,
		autoRunEnabled: false,
		autoRunHour: null,
	}

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
			{ deudaId: '7000009', amount: 25, status: 'EMI', debtDetail: ['PLAN15MB25 - 2026 Septiembre'] },
		],
	}

	it('qualifies valid contract and installments producing candidate invoices', () => {
		const result = ImportEvaluatorService.evaluate(baseContract, testConfig, '2026-10')
		assert.equal(result.isEligible, true)
		assert.equal(result.candidates.length, 2)
	})

	it('discards contract with zero debt (deuda_id === "0")', () => {
		const emptyContract: ImportableContract = {
			...baseContract,
			installments: [],
		}
		const result = ImportEvaluatorService.evaluate(emptyContract, testConfig, '2026-10')
		assert.equal(result.isEligible, false)
		assert.equal(result.items[0]?.result, 'NO_DEBT')
	})

	it('excludes contract when status is not importable', () => {
		const corteContract: ImportableContract = {
			...baseContract,
			status: 'CORTESIA',
		}
		const result = ImportEvaluatorService.evaluate(corteContract, testConfig, '2026-10')
		assert.equal(result.isEligible, false)
		assert.ok(result.items.every(i => i.result === 'EXCLUDED_STATUS'))
	})

	it('excludes contract when tax ID prefix is excluded in config', () => {
		const legalContract: ImportableContract = {
			...baseContract,
			holderTaxId: 'J-40123456-7',
			holderName: 'EMPRESA DEMO, C.A.',
		}
		const configWithExclusion: ConfigurationEntity = {
			...testConfig,
			excludedDocTypes: ['J'],
		}
		const result = ImportEvaluatorService.evaluate(legalContract, configWithExclusion, '2026-10')
		assert.equal(result.isEligible, false)
		assert.ok(result.items.every(i => i.result === 'EXCLUDED_DOCUMENT'))
	})

	it('excludes contract when currency is incoherent (< 1% of plan rate)', () => {
		const incoherentContract: ImportableContract = {
			...baseContract,
			planPrice: 20,
			installments: [
				{ deudaId: '7000010', amount: 0.05, status: 'EMI', debtDetail: ['PLAN3MB20 - 2026 Agosto'] },
			],
		}
		const result = ImportEvaluatorService.evaluate(incoherentContract, testConfig, '2026-10')
		assert.equal(result.isEligible, false)
		assert.equal(result.items[0]?.result, 'INCOHERENT_CURRENCY')
	})

	it('excludes residual debt installments (< $0.01)', () => {
		const residualContract: ImportableContract = {
			...baseContract,
			installments: [
				{ deudaId: '7000011', amount: 0.001317, status: 'EMI', debtDetail: ['PLAN15MB25 - 2026 Agosto'] },
				{ deudaId: '7000012', amount: 25, status: 'EMI', debtDetail: ['PLAN15MB25 - 2026 Septiembre'] },
			],
		}
		const result = ImportEvaluatorService.evaluate(residualContract, testConfig, '2026-10')
		assert.equal(result.isEligible, true)
		assert.equal(result.candidates.length, 1)
		assert.equal(result.candidates[0]?.installmentId, '7000012')
		assert.ok(result.items.some(i => i.result === 'RESIDUAL_DEBT'))
	})

	it('applies max recent limit and retains the most recent installments', () => {
		const multiInstallmentContract: ImportableContract = {
			...baseContract,
			installments: [
				{ deudaId: '7000001', amount: 25, status: 'EMI', debtDetail: ['PLAN15MB25 - 2026 Mayo'] },
				{ deudaId: '7000002', amount: 25, status: 'EMI', debtDetail: ['PLAN15MB25 - 2026 Junio'] },
				{ deudaId: '7000003', amount: 25, status: 'EMI', debtDetail: ['PLAN15MB25 - 2026 Julio'] },
			],
		}
		const configWithLimit: ConfigurationEntity = {
			...testConfig,
			maxRecentInstallments: 1,
		}
		const result = ImportEvaluatorService.evaluate(multiInstallmentContract, configWithLimit, '2026-10')
		assert.equal(result.isEligible, true)
		assert.equal(result.candidates.length, 1)
		assert.equal(result.candidates[0]?.installmentId, '7000003')
		assert.equal(result.items.filter(i => i.result === 'MAX_RECENT_LIMIT').length, 2)
	})
})
