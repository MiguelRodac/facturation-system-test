/**
 * SQLite Implementation for CustomerRepositoryPort (§3.5 & §3.6)
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type {
	CustomerContractEntity,
	CustomerDossierEntity,
	CustomerInvoiceEntity,
	CustomerProfileEntity,
	CustomerRepositoryPort,
	CustomerSummaryEntity,
	CustomerTimelineEvent,
} from '../domain/index.ts'

interface CustomerSummaryRow {
	id: string
	name: string
	person_type: 'NATURAL' | 'LEGAL'
	contracts_count: number
	open_invoices_count: number
	paid_invoices_count: number
	total_debt: number
	oldest_due_date: string | null
}

interface CustomerRow {
	id: string
	name: string
	person_type: 'NATURAL' | 'LEGAL'
	email: string | null
	phone: string | null
	address: string | null
	origin: string
	created_at: string
}

interface ContractRow {
	id: number
	code: string
	status: string
	plan_name: string
	plan_price: number
	branch_name: string | null
}

interface InvoiceRow {
	id: number
	external_installment_id: string
	contract_id: number
	period: string
	due_date: string
	cutoff_date: string
	total_amount: number
	balance: number
	status: 'OPEN' | 'PAID'
	is_partial_payment: number
	paid_at: string | null
	paid_by_invoice_number: string | null
	imported_at: string
}

export class SqliteCustomerRepository implements CustomerRepositoryPort {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async listCustomers(query?: string): Promise<CustomerSummaryEntity[]> {
		const sql = `
			SELECT 
				c.id,
				c.name,
				c.person_type,
				COALESCE(ctr.contracts_count, 0) AS contracts_count,
				COALESCE(inv.open_invoices_count, 0) AS open_invoices_count,
				COALESCE(inv.paid_invoices_count, 0) AS paid_invoices_count,
				COALESCE(inv.total_debt, 0) AS total_debt,
				inv.oldest_due_date
			FROM customer c
			LEFT JOIN (
				SELECT customer_id, COUNT(*) AS contracts_count
				FROM contract
				GROUP BY customer_id
			) ctr ON ctr.customer_id = c.id
			LEFT JOIN (
				SELECT 
					customer_id,
					COUNT(CASE WHEN status = 'OPEN' THEN 1 END) AS open_invoices_count,
					COUNT(CASE WHEN status = 'PAID' THEN 1 END) AS paid_invoices_count,
					SUM(CASE WHEN status = 'OPEN' THEN balance ELSE 0 END) AS total_debt,
					MIN(CASE WHEN status = 'OPEN' THEN due_date END) AS oldest_due_date
				FROM invoice
				GROUP BY customer_id
			) inv ON inv.customer_id = c.id
			${query ? 'WHERE (c.name LIKE ? OR c.id LIKE ?)' : ''}
			ORDER BY total_debt DESC, c.name ASC
		`

		const params = query ? [`%${query}%`, `%${query}%`] : []
		const rows = this.db.query<CustomerSummaryRow>(sql, params)

		return rows.map(row => ({
			id: row.id,
			name: row.name,
			personType: row.person_type,
			contractsCount: Number(row.contracts_count),
			openInvoicesCount: Number(row.open_invoices_count),
			paidInvoicesCount: Number(row.paid_invoices_count),
			totalDebt: Math.round(Number(row.total_debt) * 100) / 100,
			oldestDueDate: row.oldest_due_date,
		}))
	}

	async getCustomerDossier(customerId: string): Promise<CustomerDossierEntity | null> {
		const customerRow = this.db.queryOne<CustomerRow>(
			`SELECT id, name, person_type, email, phone, address, origin, created_at
			 FROM customer
			 WHERE id = ?`,
			[customerId]
		)

		if (!customerRow) {
			return null
		}

		const profile: CustomerProfileEntity = {
			id: customerRow.id,
			name: customerRow.name,
			personType: customerRow.person_type,
			email: customerRow.email,
			phone: customerRow.phone,
			address: customerRow.address,
			origin: customerRow.origin,
			createdAt: customerRow.created_at,
		}

		const contractRows = this.db.query<ContractRow>(
			`SELECT id, code, status, plan_name, plan_price, branch_name
			 FROM contract
			 WHERE customer_id = ?
			 ORDER BY id ASC`,
			[customerId]
		)

		const contracts: CustomerContractEntity[] = contractRows.map(row => ({
			id: row.id,
			code: row.code,
			status: row.status,
			planName: row.plan_name,
			planPrice: Number(row.plan_price),
			branchName: row.branch_name,
		}))

		const invoiceRows = this.db.query<InvoiceRow>(
			`SELECT id, external_installment_id, contract_id, period, due_date, cutoff_date,
			        total_amount, balance, status, is_partial_payment, paid_at,
			        paid_by_invoice_number, imported_at
			 FROM invoice
			 WHERE customer_id = ?
			 ORDER BY period ASC, id ASC`,
			[customerId]
		)

		const invoices: CustomerInvoiceEntity[] = invoiceRows.map(row => ({
			id: row.id,
			externalInstallmentId: row.external_installment_id,
			contractId: row.contract_id,
			period: row.period,
			dueDate: row.due_date,
			cutoffDate: row.cutoff_date,
			totalAmount: Number(row.total_amount),
			balance: Number(row.balance),
			status: row.status,
			isPartialPayment: Boolean(row.is_partial_payment),
			paidAt: row.paid_at,
			paidByInvoiceNumber: row.paid_by_invoice_number,
			importedAt: row.imported_at,
		}))

		let totalDebt = 0
		let openCount = 0
		let paidCount = 0

		for (const inv of invoices) {
			if (inv.status === 'OPEN') {
				totalDebt += inv.balance
				openCount++
			} else if (inv.status === 'PAID') {
				paidCount++
			}
		}

		const timeline: CustomerTimelineEvent[] = [
			{
				date: profile.createdAt,
				title: 'Cliente creado en Cobrix',
				description: `Importado con origen ${profile.origin}`,
				tone: 'info',
			},
		]

		for (const inv of invoices) {
			timeline.push({
				date: inv.importedAt,
				title: `Factura importada (${inv.period})`,
				description: `Monto USD ${inv.totalAmount.toFixed(2)}, vencimiento ${inv.dueDate}`,
				tone: 'mute',
			})

			if (inv.status === 'PAID' && inv.paidAt) {
				timeline.push({
					date: inv.paidAt,
					title: `Factura pagada en el ISP (${inv.period})`,
					description: inv.paidByInvoiceNumber
						? `Cobro acreditado mediante recibo ${inv.paidByInvoiceNumber}`
						: 'Marcada pagada tras conciliación de pagos',
					tone: 'ok',
				})
			}
		}

		// Sort chronological descending
		timeline.sort((a, b) => b.date.localeCompare(a.date))

		return {
			profile,
			contracts,
			invoices,
			totals: {
				totalDebt: Math.round(totalDebt * 100) / 100,
				openCount,
				paidCount,
				contractsCount: contracts.length,
			},
			timeline,
		}
	}
}
