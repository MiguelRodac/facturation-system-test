/**
 * Types & Contracts for Cobrix React Frontend
 * Exactly matching backend API response DTOs
 */

export interface CompanyConfig {
  id?: number
  company_name: string
  company_tax_id: string
  billing_email: string
  api_url: string
  api_user: string
  api_password?: string
  importable_statuses: string[]
  import_window_months: number | null
  max_recent_installments: number | null
  grace_days: number
  max_new_invoices: number | null
  max_new_amount: number | null
  excluded_doc_types: string[]
  auto_run_hour: string | null
  auto_run_enabled: boolean
  updated_at?: string
}

export interface CustomerListItem {
  id: string
  name: string
  person_type: 'NATURAL' | 'LEGAL'
  contracts_count: number
  open_invoices_count: number
  paid_invoices_count: number
  total_debt: number
  oldest_due_date?: string | null
}

export interface CustomerProfile {
  id: string
  name: string
  person_type: 'NATURAL' | 'LEGAL'
  email?: string | null
  phone?: string | null
  address?: string | null
  origin?: string
  created_at?: string
}

export interface CustomerContract {
  id: number
  code: string
  status: string
  plan_name: string
  plan_price: number
  branch_name?: string | null
}

export interface CustomerInvoice {
  id: number
  external_installment_id: string
  contract_id: number
  period: string
  due_date: string
  cutoff_date: string
  total_amount: number
  balance: number
  status: 'OPEN' | 'PAID'
  is_partial_payment: boolean
  paid_at?: string | null
  paid_by_invoice_number?: string | null
  imported_at: string
}

export interface CustomerTimelineItem {
  date: string
  title: string
  description: string
  tone: 'ok' | 'info' | 'warn' | 'mute'
}

export interface CustomerDossierTotals {
  total_debt: number
  open_count: number
  paid_count: number
  contracts_count: number
}

export interface CustomerDossier {
  profile: CustomerProfile
  totals: CustomerDossierTotals
  contracts: CustomerContract[]
  invoices: CustomerInvoice[]
  timeline: CustomerTimelineItem[]
}

export interface SyncRun {
  id: number
  type: 'IMPORT' | 'UPDATE_PAID'
  is_simulation: boolean
  status: 'COMPLETED' | 'FAILED'
  summary: string
  error_message?: string | null
  started_at: string
  finished_at: string
  duration_seconds?: number
}

export interface SyncRunItem {
  id: number
  run_id: number
  contract_id?: number | null
  installment_id?: string | null
  period?: string | null
  amount?: number | null
  result: string
  reason?: string | null
}

export interface SyncRunDetail {
  run: SyncRun
  counters: Record<string, number>
  items: SyncRunItem[]
}

export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  trace_id: string
  timestamp?: string
  errors?: Array<{ field: string; message: string }>
}
