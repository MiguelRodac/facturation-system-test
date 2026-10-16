import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ContractFactory } from '../../src/cobrix/features/contracts/domain/contract.factory.ts'
import { CustomerFactory } from '../../src/cobrix/features/customers/domain/customer.factory.ts'
import { InvoiceFactory } from '../../src/cobrix/features/invoices/domain/invoice.factory.ts'
import type { ImportableContract } from '../../src/cobrix/features/import/domain/billing-api.port.ts'
import type { CandidateInstallment } from '../../src/cobrix/features/import/domain/import.types.ts'
import { Money } from '../../src/cobrix/shared/domain/money.vo.ts'
import { Period } from '../../src/cobrix/shared/domain/period.vo.ts'

describe('Application Factories: Domain Entity Instantiation (§3.5, §4)', () => {
	const rawContract: ImportableContract = {
		contractId: 900101,
		code: 'CON-001',
		holderTaxId: '09000123',
		holderName: 'ELENA RUIZ',
		phone: '04141112233',
		email: 'elena@example.com',
		address: 'Calle Real 123',
		status: 'ACTIVO',
		planName: 'PLAN15MB25',
		planPrice: 25,
		branchName: 'Principal',
		installments: [],
	}

	it('CustomerFactory normalizes identification and infers personType', () => {
		const customer = CustomerFactory.createFromContract(rawContract, '2026-10-13T12:00:00Z')
		assert.equal(customer.id, '9000123') // Leading zero stripped
		assert.equal(customer.name, 'ELENA RUIZ')
		assert.equal(customer.personType, 'NATURAL')
		assert.equal(customer.email, 'elena@example.com')
		assert.equal(customer.origin, 'ISP')
		assert.equal(customer.createdAt, '2026-10-13T12:00:00Z')
	})

	it('CustomerFactory correctly classifies legal entity (J- prefix)', () => {
		const legalContract: ImportableContract = {
			...rawContract,
			holderTaxId: 'J-40123456-7',
			holderName: 'SERVICIOS C.A.',
		}
		const customer = CustomerFactory.createFromContract(legalContract)
		assert.equal(customer.id, 'J401234567')
		assert.equal(customer.personType, 'LEGAL')
	})

	it('ContractFactory instantiates clean ContractEntity linked to customer', () => {
		const contract = ContractFactory.createFromContract(rawContract, '9000123')
		assert.equal(contract.id, 900101)
		assert.equal(contract.code, 'CON-001')
		assert.equal(contract.customerId, '9000123')
		assert.equal(contract.status, 'ACTIVO')
		assert.equal(contract.planName, 'PLAN15MB25')
		assert.equal(contract.planPrice, 25)
		assert.equal(contract.branchName, 'Principal')
	})

	it('InvoiceFactory instantiates clean InvoiceEntity from candidate with dates and amounts', () => {
		const period = Period.fromCode('2026-08')
		const candidate: CandidateInstallment = {
			installmentId: '7000008',
			period,
			money: Money.fromDollars(25.0),
			dueDate: '2026-08-01',
			cutoffDate: '2026-08-05',
		}

		const invoice = InvoiceFactory.createFromCandidate(
			candidate,
			900101,
			'9000123',
			'2026-10-13T12:00:00Z',
		)

		assert.equal(invoice.externalInstallmentId, '7000008')
		assert.equal(invoice.contractId, 900101)
		assert.equal(invoice.customerId, '9000123')
		assert.equal(invoice.period, '2026-08')
		assert.equal(invoice.dueDate, '2026-08-01')
		assert.equal(invoice.cutoffDate, '2026-08-05')
		assert.equal(invoice.totalAmount, 25.0)
		assert.equal(invoice.balance, 25.0)
		assert.equal(invoice.status, 'OPEN')
		assert.equal(invoice.importedAt, '2026-10-13T12:00:00Z')
	})
})
