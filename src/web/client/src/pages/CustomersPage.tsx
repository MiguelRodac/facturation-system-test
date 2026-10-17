import React, { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Search,
  ArrowRight,
  RefreshCw,
  FileText,
  DollarSign,
  AlertCircle,
  X,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { api } from '../api/client'
import type { CustomerListItem } from '../api/types'

interface CustomersPageProps {
  onSelectCustomer: (id: string) => void
  notify: (text: string, type: 'success' | 'error' | 'info') => void
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onSelectCustomer,
  notify,
}) => {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')

  const fetchCustomers = useCallback(async (searchQuery = '', isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true)
      const data = await api.getCustomers(searchQuery)
      setCustomers(data)
      if (isManualRefresh) {
        notify('Directorio de clientes actualizado', 'info')
      }
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [notify])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, fetchCustomers])

  // Window focus real-time sync
  useEffect(() => {
    const onFocus = () => fetchCustomers(query, false)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [query, fetchCustomers])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Directorio de Clientes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cartera de clientes sincronizados desde el ISP, contratos vigentes y saldos por cobrar.
          </p>
        </div>
      </div>

      <Card>
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o identificación (ej. V10145063, Ana, J401234567)..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono tabular-nums"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
            <span className="text-sm font-medium">Buscando clientes...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No se encontraron clientes</p>
            <p className="text-xs text-slate-400 mt-1">
              Prueba con otro término de búsqueda o ejecuta una sincronización.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50/75">
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Cliente</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Documento</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Tipo</th>
                  <th className="py-3 px-4 font-medium text-center whitespace-nowrap">Contratos</th>
                  <th className="py-3 px-4 font-medium text-center whitespace-nowrap">Facturas</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Deuda Total</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Vencimiento Más Antiguo</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {customers.map((c) => {
                  const hasDebt = c.total_debt > 0
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCustomer(c.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Cliente con Iniciales */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors block">
                              {c.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Documento */}
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 font-medium whitespace-nowrap">
                        {c.id}
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={c.person_type === 'LEGAL' ? 'info' : 'neutral'}>
                          {c.person_type === 'LEGAL' ? 'Jurídica' : 'Natural'}
                        </Badge>
                      </td>

                      {/* Contratos */}
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700 whitespace-nowrap">
                        {c.contracts_count}
                      </td>

                      {/* Facturas */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 font-mono tabular-nums text-xs">
                          {c.open_invoices_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold">
                              {c.open_invoices_count} ab.
                            </span>
                          )}
                          {c.paid_invoices_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold">
                              {c.paid_invoices_count} pag.
                            </span>
                          )}
                          {c.open_invoices_count === 0 && c.paid_invoices_count === 0 && (
                            <span className="text-slate-400">0</span>
                          )}
                        </div>
                      </td>

                      {/* Deuda Total */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {hasDebt ? (
                          <span className="font-bold text-amber-700">
                            USD {c.total_debt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Al día</span>
                        )}
                      </td>

                      {/* Vencimiento Más Antiguo */}
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        {c.oldest_due_date ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            {c.oldest_due_date}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectCustomer(c.id)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                        >
                          <span>Expediente</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
