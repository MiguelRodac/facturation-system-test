/**
 * SQLite Implementation of InvoiceRepositoryPort
 * Strictly queries the 'invoice' table only
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { CustomerInvoiceSummary, InvoiceEntity, InvoiceRepositoryPort } from '../domain/index.ts'

interface InvoiceRow {
	id: number
	external_installment_id: string
	contract_id: number
	customer_id: string
	period: string
	due_date: string
	cutoff_date: string
	total_amount: number
	balance: number
	status: 'OPEN' | 'PAID'
	paid_at: string | null
	paid_by_invoice_number: string | null
	is_partial_payment: number
	imported_at: string
}

interface SummaryRow {
	customer_id: string
	open_count: number
	paid_count: number
	total_debt: number
	oldest_due_date: string | null
}

export class SqliteInvoiceRepository implements InvoiceRepositoryPort {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async findByCustomerId(customerId: string): Promise<InvoiceEntity[]> {
		const sql = `
			SELECT id, external_installment_id, contract_id, customer_id, period,
			       due_date, cutoff_date, total_amount, balance, status,
			       paid_at, paid_by_invoice_number, is_partial_payment, imported_at
			FROM invoice
			WHERE customer_id = ?
			ORDER BY period ASC, id ASC
		`
		const rows = this.db.query<InvoiceRow>(sql, [customerId])
		return rows.map(r => this.toEntity(r))
	}

	async findSummaries(): Promise<Map<string, CustomerInvoiceSummary>> {
		const sql = `
			SELECT 
				customer_id,
				COUNT(CASE WHEN status = 'OPEN' THEN 1 END) AS open_count,
				COUNT(CASE WHEN status = 'PAID' THEN 1 END) AS paid_count,
				SUM(CASE WHEN status = 'OPEN' THEN balance ELSE 0 END) AS total_debt,
				MIN(CASE WHEN status = 'OPEN' THEN due_date END) AS oldest_due_date
			FROM invoice
			GROUP BY customer_id
		`
		const rows = this.db.query<SummaryRow>(sql)
		const map = new Map<string, CustomerInvoiceSummary>()
		for (const r of rows) {
			map.set(r.customer_id, {
				customerId: r.customer_id,
				openCount: Number(r.open_count),
				paidCount: Number(r.paid_count),
				totalDebt: Math.round(Number(r.total_debt) * 100) / 100,
				oldestDueDate: r.oldest_due_date,
			})
		}
		return map
	}

	async getSummaryByCustomerId(customerId: string): Promise<CustomerInvoiceSummary | null> {
		const sql = `
			SELECT 
				customer_id,
				COUNT(CASE WHEN status = 'OPEN' THEN 1 END) AS open_count,
				COUNT(CASE WHEN status = 'PAID' THEN 1 END) AS paid_count,
				SUM(CASE WHEN status = 'OPEN' THEN balance ELSE 0 END) AS total_debt,
				MIN(CASE WHEN status = 'OPEN' THEN due_date END) AS oldest_due_date
			FROM invoice
			WHERE customer_id = ?
			GROUP BY customer_id
		`
		const r = this.db.queryOne<SummaryRow>(sql, [customerId])
		if (!r) return null
		return {
			customerId: r.customer_id,
			openCount: Number(r.open_count),
			paidCount: Number(r.paid_count),
			totalDebt: Math.round(Number(r.total_debt) * 100) / 100,
			oldestDueDate: r.oldest_due_date,
		}
	}

	async findOpenInvoices(): Promise<InvoiceEntity[]> {
		const sql = `
			SELECT id, external_installment_id, contract_id, customer_id, period,
			       due_date, cutoff_date, total_amount, balance, status,
			       paid_at, paid_by_invoice_number, is_partial_payment, imported_at
			FROM invoice
			WHERE status = 'OPEN'
			ORDER BY period ASC, id ASC
		`
		const rows = this.db.query<InvoiceRow>(sql)
		return rows.map(r => this.toEntity(r))
	}

	private toEntity(r: InvoiceRow): InvoiceEntity {
		return {
			id: r.id,
			externalInstallmentId: r.external_installment_id,
			contractId: r.contract_id,
			customerId: r.customer_id,
			period: r.period,
			dueDate: r.due_date,
			cutoffDate: r.cutoff_date,
			totalAmount: Number(r.total_amount),
			balance: Number(r.balance),
			status: r.status,
			paidAt: r.paid_at,
			paidByInvoiceNumber: r.paid_by_invoice_number,
			isPartialPayment: Boolean(r.is_partial_payment),
			importedAt: r.imported_at,
		}
	}
}
