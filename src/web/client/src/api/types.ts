export interface CompanyConfig {
  company_name: string
  company_tax_id: string
  billing_email: string
  api_url: string
  api_user: string
  api_password?: string
  importable_statuses: string
  grace_days: number
  auto_run_hour: string
}

export interface CustomerListItem {
  id: string
  name: string
  person_type: 'NATURAL' | 'LEGAL'
  open_invoices_count: number
  paid_invoices_count: number
  contracts_count: number
  total_debt: number
  oldest_due_date?: string
}

export interface CustomerProfile {
  id: string
  name: string
  person_type: 'NATURAL' | 'LEGAL'
  email?: string
  phone?: string
  address?: string
  origin?: string
  created_at?: string
}

export interface CustomerContract {
  id: number
  code: string
  status: string
  plan_name: string
  plan_price: number
  branch_name?: string
  created_at?: string
}

export interface CustomerInvoice {
  id: number
  installment_id: string
  contract_id: number
  period: string
  due_date: string
  cutoff_date: string
  total_amount: number
  balance: number
  status: 'OPEN' | 'PAID'
  paid_at?: string
  receipt_number?: string
  is_partial_payment?: boolean
}

export interface CustomerTimelineItem {
  type: string
  date: string
  title: string
  description: string
  amount?: number
  receipt_number?: string
}

export interface CustomerDossier {
  profile: CustomerProfile
  totals: {
    total_debt: number
    open_invoices_count: number
    paid_invoices_count: number
    contracts_count: number
  }
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
  error_message?: string
  started_at: string
  finished_at: string
  duration_seconds: number
  counts: {
    total: number
    created: number
    paid: number
    failed: number
  }
}

export interface SyncRunItem {
  id: number
  run_id: number
  contract_id: number
  installment_id: string
  period: string
  amount: number
  result: string
  reason?: string
}

export interface SyncRunDetail {
  run: SyncRun
  items: SyncRunItem[]
}

export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  trace_id: string
  errors?: Record<string, string[]>
}
