/**
 * SQLite Implementation of InvoiceRepositoryPort
 * Strictly queries the 'invoice' table only
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { CustomerInvoiceSummary, InvoiceEntity, InvoiceRepositoryPort } from '../domain/index.ts'
import { InvoiceMapper, type InvoiceRow, type SummaryRow } from './invoice.mapper.ts'

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
		return rows.map(InvoiceMapper.toDomain)
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
			map.set(r.customer_id, InvoiceMapper.toSummaryDomain(r))
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
		return InvoiceMapper.toSummaryDomain(r)
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
		return rows.map(InvoiceMapper.toDomain)
	}
}
