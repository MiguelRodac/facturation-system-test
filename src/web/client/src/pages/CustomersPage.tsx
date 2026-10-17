import React, { useEffect, useState } from 'react'
import { Search, X, Users, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { api } from '../api/client'
import type { CustomerListItem } from '../api/types'

interface CustomersPageProps {
  onSelectCustomer: (id: string) => void
  notify: (text: string, type: 'success' | 'error' | 'info') => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ onSelectCustomer, notify }) => {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true)
        const list = await api.getCustomers(query)
        setCustomers(list)
      } catch (err: unknown) {
        notify((err as Error).message, 'error')
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      loadCustomers()
    }, 200)

    return () => clearTimeout(timer)
  }, [query, notify])

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
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
              className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono tabular-nums"
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
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-medium">Cliente</th>
                  <th className="pb-3 font-medium">Documento</th>
                  <th className="pb-3 font-medium">Tipo</th>
                  <th className="pb-3 font-medium text-center">Contratos</th>
                  <th className="pb-3 font-medium text-center">Facturas</th>
                  <th className="pb-3 font-medium text-right">Deuda Total</th>
                  <th className="pb-3 font-medium">Vencimiento Más Antiguo</th>
                  <th className="pb-3 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const hasDebt = c.total_debt > 0
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCustomer(c.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Cliente con Iniciales */}
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                              {c.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Documento */}
                      <td className="py-3 font-mono tabular-nums text-xs text-slate-600 font-medium">
                        {c.id}
                      </td>

                      {/* Tipo */}
                      <td className="py-3">
                        <Badge variant={c.person_type === 'LEGAL' ? 'info' : 'neutral'}>
                          {c.person_type === 'LEGAL' ? 'Jurídica' : 'Natural'}
                        </Badge>
                      </td>

                      {/* Contratos */}
                      <td className="py-3 text-center font-mono tabular-nums text-slate-700">
                        {c.contracts_count}
                      </td>

                      {/* Facturas */}
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono tabular-nums text-xs">
                          {c.open_invoices_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold">
                              {c.open_invoices_count} ab.
                            </span>
                          )}
                          {c.paid_invoices_count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                              {c.paid_invoices_count} pag.
                            </span>
                          )}
                          {c.open_invoices_count === 0 && c.paid_invoices_count === 0 && (
                            <span className="text-slate-300">0</span>
                          )}
                        </div>
                      </td>

                      {/* Deuda Total */}
                      <td className="py-3 text-right">
                        {hasDebt ? (
                          <span className="font-bold text-slate-900 font-mono tabular-nums">
                            USD {c.total_debt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono tabular-nums">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Al día</span>
                          </span>
                        )}
                      </td>

                      {/* Vencimiento Más Antiguo */}
                      <td className="py-3 text-xs">
                        {hasDebt && c.oldest_due_date ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono tabular-nums bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>{c.oldest_due_date}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Acción */}
                      <td className="py-3 text-right">
                        <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-600 inline-flex items-center gap-1 transition-colors">
                          <span>Ver</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
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
