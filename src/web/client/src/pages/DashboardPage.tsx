import React, { useEffect, useState, useCallback } from 'react'
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
import { formatCaracasDateTime } from '../utils/date'
import type { DashboardSummary } from '../api/types'
import type { PageId } from '../components/layout/Navbar'

interface DashboardPageProps {
  onNavigate: (page: PageId) => void
  onSelectCustomer: (id: string) => void
  onProviderLoaded?: (name: string) => void
  notify: (text: string, type: 'success' | 'error' | 'info') => void
}

function parseSummaryBadges(summary: string): string[] {
  if (!summary) return []
  if (summary.trim().startsWith('{')) {
    try {
      const data = JSON.parse(summary)
      const parts: string[] = []
      if (data.isSimulation) parts.push('Simulación')
      if (data.totalContractsChecked !== undefined) parts.push(`Contratos: ${data.totalContractsChecked}`)
      if (data.totalInstallmentsChecked !== undefined) parts.push(`Cuotas: ${data.totalInstallmentsChecked}`)
      if (data.totalInvoicesEvaluated !== undefined) parts.push(`Facturas: ${data.totalInvoicesEvaluated}`)
      if (data.importedInvoicesCount !== undefined) {
        const amt = data.importedAmount !== undefined ? ` ($${Number(data.importedAmount).toFixed(2)})` : ''
        parts.push(`Importadas: ${data.importedInvoicesCount}${amt}`)
      }
      if (data.paidInvoicesCount !== undefined) {
        const amt = data.paidAmount !== undefined ? ` ($${Number(data.paidAmount).toFixed(2)})` : ''
        parts.push(`Pagadas: ${data.paidInvoicesCount}${amt}`)
      }
      if (data.partialPaymentsCount) parts.push(`Parciales: ${data.partialPaymentsCount}`)
      if (data.importedCustomersCount) parts.push(`Clientes: ${data.importedCustomersCount}`)
      if (data.error) parts.push(`Error: ${data.error}`)
      return parts.length > 0 ? parts : [summary]
    } catch {
      // fallback to raw
    }
  }
  return summary.split('·').map((p) => p.trim()).filter(Boolean)
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectCustomer,
  onProviderLoaded,
  notify,
}) => {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true)
      const dashboard = await api.getDashboard()
      setData(dashboard)
      if (onProviderLoaded && dashboard.provider?.company_name) {
        onProviderLoaded(dashboard.provider.company_name)
      }
      if (isManualRefresh) {
        notify('Datos actualizados en tiempo real', 'info')
      }
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [notify, onProviderLoaded])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time synchronization on window focus
  useEffect(() => {
    const handleFocus = () => {
      loadData(false)
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadData])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Cargando panel operacional...</span>
        </div>
      </div>
    )
  }

  const kpis = data?.kpis
  const provider = data?.provider
  const topDebtors = data?.top_debtors ?? []
  const recentRuns = data?.recent_runs ?? []
  const lastRun = kpis?.last_run ?? null

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
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('sincronizacion')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-xs shadow-emerald-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar Cartera</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Clientes */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Clientes</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {kpis?.total_customers ?? 0}
            </span>
            <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Cartera registrada
            </span>
          </div>
        </div>

        {/* KPI 2: Contratos */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Contratos</span>
            <FileText className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {kpis?.total_contracts ?? 0}
            </span>
            <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Contratos en Cobrix
            </span>
          </div>
        </div>

        {/* KPI 3: Por cobrar (Highlighted) */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Por cobrar</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-950 dark:text-emerald-100 font-mono tabular-nums tracking-tight">
              USD {(kpis?.total_debt ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1 font-mono tabular-nums">
              {kpis?.total_open_invoices ?? 0} facturas abiertas
            </span>
          </div>
        </div>

        {/* KPI 4: Pagadas / Conciliadas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pagadas</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {kpis?.total_paid_invoices ?? 0}
            </span>
            <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Cuotas conciliadas
            </span>
          </div>
        </div>

        {/* KPI 5: Última corrida */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Última corrida</span>
            <Activity className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="mt-2.5">
            {lastRun ? (
              <>
                <Badge variant={lastRun.status === 'COMPLETED' ? 'paid' : 'danger'}>
                  {lastRun.type} {lastRun.is_simulation ? '(SIM)' : ''}
                </Badge>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-mono tabular-nums truncate">
                  {lastRun.finished_at ? formatCaracasDateTime(lastRun.finished_at) : 'En curso'}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 block mt-2">Sin actividad</span>
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
              <Server className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Proveedor (ISP)</span>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Empresa
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                  {provider?.company_name || 'Cobrix Telecom'}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  RIF / Tax ID
                </span>
                <span className="text-sm font-mono tabular-nums text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {provider?.company_tax_id || 'J-50123456-0'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  URL API Proveedor
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
                  {provider?.api_url || 'http://127.0.0.1:4310'}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Usuario API
                </span>
                <span className="text-sm font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {provider?.api_user || 'cobrix'}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Auto-Run Diario
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {provider?.auto_run_enabled ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                      {provider.auto_run_hour || '03:00'} VET
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Desactivado</span>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
              <a
                href={`${provider?.api_url || 'http://127.0.0.1:4310'}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span>Swagger ISP (4310)</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href={`${provider?.api_url || 'http://127.0.0.1:4310'}/api/v1/openapi.json`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span>OpenAPI ISP</span>
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
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {topDebtors.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
              No hay clientes registrados o con saldo deudor.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-sm divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50/75 dark:bg-slate-800/60">
                  <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Cliente</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Documento</th>
                    <th className="py-3 px-4 font-medium text-center whitespace-nowrap">Facturas</th>
                    <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Deuda</th>
                    <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {topDebtors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors group">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{c.name}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{c.id}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge variant="open">{c.open_invoices_count} abiertas</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        USD {c.total_debt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectCustomer(c.id)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors cursor-pointer"
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
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Ver historial completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        {recentRuns.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
            Aún no se han ejecutado corridas de sincronización.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50/75 dark:bg-slate-800/60">
                <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">ID</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Tipo / Modo</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Fecha (Caracas)</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Resultado / Métricas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {recentRuns.map((r) => {
                  const parts = parseSummaryBadges(r.summary)
                  return (
                    <tr key={r.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                          #{r.id}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={r.type === 'IMPORT' ? 'info' : 'paid'}>
                            {r.type === 'IMPORT' ? 'Importación' : 'Conciliación'}
                          </Badge>
                          {r.is_simulation && (
                            <span className="text-[10px] font-semibold tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Simulación
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${r.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className={`text-xs font-semibold ${r.status === 'COMPLETED' ? 'text-slate-800 dark:text-slate-200' : 'text-rose-700 dark:text-rose-400'}`}>
                            {r.status === 'COMPLETED' ? 'Completado' : 'Fallido'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                        {formatCaracasDateTime(r.finished_at || r.started_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {parts.length > 0 ? (
                            parts.map((part, pIdx) => {
                              const isNegative = part.toLowerCase().includes('fallid') || part.toLowerCase().includes('error')
                              const isPaid = part.toLowerCase().includes('pagad') || part.toLowerCase().includes('al día')
                              const isNew = part.toLowerCase().includes('nueva') || part.toLowerCase().includes('importad')

                              const badgeClass = isNegative
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                                : isPaid
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : isNew
                                ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'

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
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
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
