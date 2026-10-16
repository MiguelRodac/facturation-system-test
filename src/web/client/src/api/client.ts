import type {
  CompanyConfig,
  CustomerListItem,
  CustomerDossier,
  SyncRun,
  SyncRunDetail,
  ProblemDetails,
} from './types'

const BASE_URL = '/api/v1'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, application/problem+json')
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorData: ProblemDetails | null = null
    try {
      errorData = await response.json()
    } catch {
      // not JSON
    }
    const message = errorData?.detail || `Error HTTP ${response.status}: ${response.statusText}`
    const error = new Error(message) as Error & { problem?: ProblemDetails }
    if (errorData) error.problem = errorData
    throw error
  }

  const json = await response.json()
  return (json.data !== undefined ? json.data : json) as T
}

export const api = {
  // Config
  getConfig: () => request<CompanyConfig>('/config'),
  updateConfig: (data: Partial<CompanyConfig>) =>
    request<CompanyConfig>('/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  testConnection: () =>
    request<{ connected: boolean; ok?: boolean; message: string; total_contracts?: number }>('/config/test-connection', {
      method: 'POST',
    }),

  // Customers
  getCustomers: (q?: string) =>
    request<CustomerListItem[]>(`/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getCustomerDossier: (id: string) =>
    request<CustomerDossier>(`/customers/${encodeURIComponent(id)}`),

  // Sync
  importInstallments: (simulate: boolean = false) =>
    request<{
      is_simulation: boolean
      imported_customers_count: number
      imported_invoices_count: number
      evaluated_contracts_count: number
      duration_seconds: number
    }>(`/sync/import?simulate=${simulate}`, { method: 'POST' }),

  reconcilePayments: (simulate: boolean = false) =>
    request<{
      is_simulation: boolean
      paid_invoices_count: number
      partial_payments_count: number
      duration_seconds: number
    }>(`/sync/reconcile?simulate=${simulate}`, { method: 'POST' }),

  getRuns: () => request<SyncRun[]>('/sync/runs'),
  getRunDetail: (id: number) => request<SyncRunDetail>(`/sync/runs/${id}`),
}
