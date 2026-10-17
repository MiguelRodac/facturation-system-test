/**
 * Dashboard Domain Entities & DTOs (BFF Aggregator)
 */

export interface DashboardKPIDto {
	readonly total_customers: number
	readonly total_contracts: number
	readonly total_debt: number
	readonly total_open_invoices: number
	readonly total_paid_invoices: number
	readonly last_run: {
		readonly id: number
		readonly type: string
		readonly is_simulation: boolean
		readonly status: string
		readonly summary: string
		readonly finished_at: string
	} | null
}

export interface DashboardProviderDto {
	readonly company_name: string
	readonly company_tax_id: string
	readonly billing_email: string
	readonly api_url: string
	readonly api_user: string
	readonly auto_run_enabled: boolean
	readonly auto_run_hour: string | null
}

export interface DashboardDebtorDto {
	readonly id: string
	readonly name: string
	readonly person_type: 'NATURAL' | 'LEGAL'
	readonly open_invoices_count: number
	readonly total_debt: number
}

export interface DashboardSummaryDto {
	readonly kpis: DashboardKPIDto
	readonly provider: DashboardProviderDto
	readonly top_debtors: readonly DashboardDebtorDto[]
	readonly recent_runs: ReadonlyArray<{
		readonly id: number
		readonly type: string
		readonly is_simulation: boolean
		readonly status: string
		readonly summary: string
		readonly started_at: string
		readonly finished_at: string
	}>
}
