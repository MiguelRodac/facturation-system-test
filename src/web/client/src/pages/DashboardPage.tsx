import React, { useEffect, useState } from 'react'
import {
  Users,
  DollarSign,
  CheckCircle2,
  Activity,
  FileText,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Server,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { api } from '../api/client'
import type { CustomerListItem, SyncRun, CompanyConfig } from '../api/types'
import type { PageId } from '../components/layout/Navbar'

interface DashboardPageProps {
  onNavigate: (page: PageId) => void
  onSelectCustomer: (id: string) => void
  notify: (text: string, type: 'success' | 'error' | 'info') => void
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectCustomer,
  notify,
}) => {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [runs, setRuns] = useState<SyncRun[]>([])
  const [config, setConfig] = useState<CompanyConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [custList, runList, cfg] = await Promise.all([
          api.getCustomers(),
          api.getRuns(),
          api.getConfig().catch(() => null),
        ])
        setCustomers(custList)
        setRuns(runList)
        if (cfg) setConfig(cfg)
      } catch (err: unknown) {
        notify((err as Error).message, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [notify])

  const totalDebt = customers.reduce((acc, c) => acc + c.total_debt, 0)
  const totalOpenInvoices = customers.reduce((acc, c) => acc + c.open_invoices_count, 0)
  const totalPaidInvoices = customers.reduce((acc, c) => acc + c.paid_invoices_count, 0)
  const totalContracts = customers.reduce((acc, c) => acc + c.contracts_count, 0)
  const topDebtors = [...customers].sort((a, b) => b.total_debt - a.total_debt).slice(0, 5)
  const recentRuns = runs.slice(0, 5)
  const lastRun = runs.length > 0 ? runs[0] : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="text-sm font-medium">Cargando panel operacional...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Resumen General
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoreo en tiempo real de cartera, sincronizaciones y conciliaciones del ISP.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('sincronizacion')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-xs shadow-emerald-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar Cartera</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Clientes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Clientes</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {customers.length}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">
              Cartera registrada
            </span>
          </div>
        </div>

        {/* KPI 2: Contratos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Contratos</span>
            <FileText className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totalContracts}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">
              Contratos en Cobrix
            </span>
          </div>
        </div>

        {/* KPI 3: Por cobrar (Highlighted) */}
        <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-200 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">Por cobrar</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-950 font-mono tabular-nums tracking-tight">
              USD {totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[11px] text-emerald-700 font-medium mt-1 font-mono tabular-nums">
              {totalOpenInvoices} facturas abiertas
            </span>
          </div>
        </div>

        {/* KPI 4: Pagadas / Conciliadas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pagadas</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
              {totalPaidInvoices}
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">
              Cuotas conciliadas
            </span>
          </div>
        </div>

        {/* KPI 5: Última corrida */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Última corrida</span>
            <Activity className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="mt-2.5">
            {lastRun ? (
              <>
                <Badge variant={lastRun.status === 'COMPLETED' ? 'paid' : 'danger'}>
                  {lastRun.type} {lastRun.is_simulation ? '(SIM)' : ''}
                </Badge>
                <span className="block text-[11px] text-slate-400 mt-1.5 font-mono tabular-nums truncate">
                  {lastRun.finished_at || lastRun.started_at}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 block mt-2">Sin actividad</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Proveedor Card & Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proveedor ISP Card */}
        <Card
          className="lg:col-span-1"
          title={
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-900 text-sm">Proveedor (ISP)</span>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Empresa
                </span>
                <span className="text-sm font-semibold text-slate-900 mt-0.5 block truncate">
                  {config?.company_name || 'Cobrix Telecom'}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  RIF / Tax ID
                </span>
                <span className="text-sm font-mono tabular-nums text-slate-700 mt-0.5 block">
                  {config?.company_tax_id || 'J-50123456-0'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  URL API Proveedor
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-700 mt-0.5 block truncate">
                  {config?.api_url || 'http://127.0.0.1:4310'}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Usuario API
                </span>
                <span className="text-sm font-mono text-slate-700 mt-0.5 block">
                  {config?.api_user || 'cobrix'}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Auto-Run Diario
                </span>
                <span className="text-sm font-semibold text-slate-700 mt-0.5 block">
                  {config?.auto_run_enabled ? (
                    <span className="text-emerald-600 font-mono tabular-nums">
                      {config.auto_run_hour || '03:00'} VET
                    </span>
                  ) : (
                    <span className="text-slate-400">Desactivado</span>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <span>Swagger UI</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <span>openapi.json</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </Card>

        {/* Top Debtors Table */}
        <Card
          className="lg:col-span-2"
          title="Top Clientes con Mayor Deuda"
          action={
            <button
              onClick={() => onNavigate('clientes')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {topDebtors.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              No hay clientes registrados o con saldo deudor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Documento</th>
                    <th className="pb-3 font-medium text-center">Facturas</th>
                    <th className="pb-3 font-medium text-right">Deuda</th>
                    <th className="pb-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topDebtors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3 font-semibold text-slate-900">{c.name}</td>
                      <td className="py-3 font-mono tabular-nums text-xs text-slate-600">{c.id}</td>
                      <td className="py-3 text-center">
                        <Badge variant="open">{c.open_invoices_count} abiertas</Badge>
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums font-bold text-amber-700">
                        USD {c.total_debt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onSelectCustomer(c.id)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          Expediente &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Últimas Corridas (with metric badges split by ·) */}
      <Card
        title="Últimas Corridas de Sincronización"
        action={
          <button
            onClick={() => onNavigate('sincronizacion')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
          >
            <span>Ver historial completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        {recentRuns.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Aún no se han ejecutado corridas de sincronización.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Tipo / Modo</th>
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Resultado / Métricas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRuns.map((r) => {
                  const parts = r.summary ? r.summary.split('·').map((p) => p.trim()).filter(Boolean) : []
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 font-mono tabular-nums text-xs text-slate-400">
                        #{r.id}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={r.type === 'IMPORT' ? 'info' : 'paid'}>
                            {r.type === 'IMPORT' ? 'Importación' : 'Conciliación'}
                          </Badge>
                          {r.is_simulation && (
                            <Badge variant="neutral">Simulación</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-xs text-slate-600 font-mono tabular-nums">
                        {r.finished_at || r.started_at}
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {parts.length > 0 ? (
                            parts.map((part, pIdx) => {
                              const isNegative = part.toLowerCase().includes('fallid') || part.toLowerCase().includes('error')
                              const isPaid = part.toLowerCase().includes('pagad') || part.toLowerCase().includes('al día')
                              const isNew = part.toLowerCase().includes('nueva') || part.toLowerCase().includes('importad')

                              const badgeClass = isNegative
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isNew
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'

                              return (
                                <span
                                  key={pIdx}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-mono tabular-nums ${badgeClass}`}
                                >
                                  {part}
                                </span>
                              )
                            })
                          ) : (
                            <span className="text-xs text-slate-500 font-mono tabular-nums">
                              {r.summary || 'Completado sin observaciones'}
                            </span>
                          )}
                        </div>
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
