/**
 * SQLite Dashboard Repository Implementation
 *
 * Runs high-efficiency aggregated queries to fulfill the Dashboard BFF contract in a single roundtrip.
 */

import type { DatabaseClient } from '../../../shared/infrastructure/database/database.client.ts'
import type { DashboardRepositoryPort } from '../domain/dashboard.repository.ts'
import type { DashboardSummaryDto } from '../domain/dashboard.entities.ts'

export class SqliteDashboardRepository implements DashboardRepositoryPort {
	private readonly db: DatabaseClient

	constructor(db: DatabaseClient) {
		this.db = db
	}

	async getSummary(): Promise<DashboardSummaryDto> {
		// 1. Total Customers
		const custRow = this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM customer')
		const totalCustomers = custRow?.count ?? 0

		// 2. Total Contracts
		const contractRow = this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contract')
		const totalContracts = contractRow?.count ?? 0

		// 3. Open Debt & Invoices
		const openRow = this.db.queryOne<{ total_debt: number | null; open_count: number }>(
			"SELECT COALESCE(SUM(balance), 0) as total_debt, COUNT(*) as open_count FROM invoice WHERE status = 'OPEN'"
		)
		const totalDebt = openRow?.total_debt ?? 0
		const totalOpenInvoices = openRow?.open_count ?? 0

		// 4. Paid Invoices
		const paidRow = this.db.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM invoice WHERE status = 'PAID'"
		)
		const totalPaidInvoices = paidRow?.count ?? 0

		// 5. Last Run
		const lastRunRow = this.db.queryOne<{
			id: number
			type: string
			is_simulation: number
			status: string
			summary: string
			finished_at: string
		}>('SELECT id, type, is_simulation, status, summary, finished_at FROM sync_run ORDER BY id DESC LIMIT 1')

		const lastRun = lastRunRow
			? {
					id: lastRunRow.id,
					type: lastRunRow.type,
					is_simulation: Boolean(lastRunRow.is_simulation),
					status: lastRunRow.status,
					summary: lastRunRow.summary,
					finished_at: lastRunRow.finished_at,
			  }
			: null

		// 6. Provider Info
		const configRow = this.db.queryOne<{
			company_name: string
			company_tax_id: string
			billing_email: string
			api_url: string
			api_user: string
			auto_run_enabled: number
			auto_run_hour: string | null
		}>(
			'SELECT company_name, company_tax_id, billing_email, api_url, api_user, auto_run_enabled, auto_run_hour FROM company_config WHERE id = 1'
		)

		const provider = {
			company_name: configRow?.company_name ?? 'Cobrix Telecom Demo',
			company_tax_id: configRow?.company_tax_id ?? 'J-12345678-9',
			billing_email: configRow?.billing_email ?? 'cobranzas@cobrix.local',
			api_url: configRow?.api_url ?? 'http://127.0.0.1:4310',
			api_user: configRow?.api_user ?? 'cobrix',
			auto_run_enabled: Boolean(configRow?.auto_run_enabled),
			auto_run_hour: configRow?.auto_run_hour ?? null,
		}

		// 7. Top 5 Debtors
		const debtorRows = this.db.query<{
			id: string
			name: string
			person_type: 'NATURAL' | 'LEGAL'
			open_invoices_count: number
			total_debt: number
		}>(`
			SELECT c.id, c.name, c.person_type,
			       COUNT(i.id) as open_invoices_count,
			       COALESCE(SUM(i.balance), 0) as total_debt
			FROM customer c
			JOIN invoice i ON i.customer_id = c.id
			WHERE i.status = 'OPEN'
			GROUP BY c.id, c.name, c.person_type
			ORDER BY total_debt DESC
			LIMIT 5
		`)

		// 8. Recent 5 Sync Runs
		const runRows = this.db.query<{
			id: number
			type: string
			is_simulation: number
			status: string
			summary: string
			started_at: string
			finished_at: string
		}>('SELECT id, type, is_simulation, status, summary, started_at, finished_at FROM sync_run ORDER BY id DESC LIMIT 5')

		const recentRuns = runRows.map((r) => ({
			id: r.id,
			type: r.type,
			is_simulation: Boolean(r.is_simulation),
			status: r.status,
			summary: r.summary,
			started_at: r.started_at,
			finished_at: r.finished_at,
		}))

		return {
			kpis: {
				total_customers: totalCustomers,
				total_contracts: totalContracts,
				total_debt: totalDebt,
				total_open_invoices: totalOpenInvoices,
				total_paid_invoices: totalPaidInvoices,
				last_run: lastRun,
			},
			provider,
			top_debtors: debtorRows,
			recent_runs: recentRuns,
		}
	}
}
