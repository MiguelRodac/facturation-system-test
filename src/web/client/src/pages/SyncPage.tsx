import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Download,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  Play,
  FlaskConical,
  Clock,
  Calendar,
  AlertCircle,
  FileCheck,
  Loader2,
  Filter,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { api } from '../api/client'
import { formatCaracasDateTime } from '../utils/date'
import type { SyncRun, SyncRunDetail } from '../api/types'

interface SyncPageProps {
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
      // fallback
    }
  }
  return summary.split('·').map((p) => p.trim()).filter(Boolean)
}

const KNOWN_COUNTERS = [
  'ALREADY_IMPORTED',
  'EXCLUDED_STATUS',
  'RESIDUAL_DEBT',
  'INCOHERENT_CURRENCY',
  'EXCLUDED_DOC_TYPE',
  'OUT_OF_WINDOW',
  'NO_DEBT',
  'CAP_EXCEEDED',
  'IMPORTED_NEW',
  'PAID',
  'PARTIAL_PAYMENT',
]

function getResultBadge(result: string) {
  switch (result) {
    case 'CREATED':
    case 'IMPORTED':
    case 'MARKED_PAID':
    case 'PAID':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {result}
        </span>
      )
    case 'SIMULATED_NEW':
    case 'SIMULATED_PAID':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          {result}
        </span>
      )
    case 'ALREADY_IMPORTED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          {result}
        </span>
      )
    case 'EXCLUDED_STATUS':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {result}
        </span>
      )
    case 'EXCLUDED_DOC_TYPE':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          {result}
        </span>
      )
    case 'RESIDUAL_DEBT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          {result}
        </span>
      )
    case 'INCOHERENT_CURRENCY':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          {result}
        </span>
      )
    case 'OUT_OF_WINDOW':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {result}
        </span>
      )
    case 'CAP_EXCEEDED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          {result}
        </span>
      )
    case 'NO_DEBT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
          {result}
        </span>
      )
    case 'PARTIAL_PAYMENT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {result}
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {result}
        </span>
      )
  }
}

export const SyncPage: React.FC<SyncPageProps> = ({ notify }) => {
  const [runs, setRuns] = useState<SyncRun[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  // Audit Modal State
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [runDetail, setRunDetail] = useState<SyncRunDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [hideZeros, setHideZeros] = useState(false)
  const [filterResult, setFilterResult] = useState<string>('ALL')

  // Confirm Reset Modal State
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const loadRuns = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true)
      const data = await api.getRuns()
      setRuns(data)
      if (isManualRefresh) {
        notify('Historial de corridas actualizado', 'info')
      }
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [notify])

  useEffect(() => {
    loadRuns()
  }, [loadRuns])

  // Window focus real-time sync
  useEffect(() => {
    const onFocus = () => loadRuns(false)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadRuns])

  const handleImport = async (simulate: boolean) => {
    try {
      setSyncing(simulate ? 'import-sim' : 'import-real')
      notify(
        simulate ? 'Ejecutando simulación de importación...' : 'Importando cuotas desde el ISP...',
        'info'
      )
      const res = await api.importInstallments(simulate)
      notify(
        `Importación (${simulate ? 'Simulada' : 'Real'}): ${res.imported_customers_count} clientes, ${res.imported_invoices_count} facturas (${res.duration_seconds}s)`,
        'success'
      )
      await loadRuns()
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setSyncing(null)
    }
  }

  const handleReconcile = async (simulate: boolean) => {
    try {
      setSyncing(simulate ? 'reconcile-sim' : 'reconcile-real')
      notify(
        simulate ? 'Simulando conciliación de pagos...' : 'Conciliando pagos con el ISP...',
        'info'
      )
      const res = await api.reconcilePayments(simulate)
      notify(
        `Conciliación (${simulate ? 'Simulada' : 'Real'}): ${res.paid_invoices_count} facturas pagadas, ${res.partial_payments_count} abonos parciales (${res.duration_seconds}s)`,
        'success'
      )
      await loadRuns()
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setSyncing(null)
    }
  }

  const handleOpenAudit = async (runId: number) => {
    setSelectedRunId(runId)
    setFilterResult('ALL')
    try {
      setLoadingDetail(true)
      const detail = await api.getRunDetail(runId)
      setRunDetail(detail)
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedRunId(null)
    setRunDetail(null)
  }

  const handleResetData = async () => {
    setShowResetConfirm(false)
    try {
      setResetting(true)
      notify('Reiniciando base de datos de Cobrix...', 'info')
      const res = await api.resetData()
      notify(res.message || 'Base de datos reiniciada con éxito. Sandbox en cero.', 'success')
      await loadRuns()
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setResetting(false)
    }
  }

  // Memoized counters handling zero toggle
  const displayedCounters = useMemo(() => {
    if (!runDetail?.counters) return []
    const map: Record<string, number> = {}
    for (const k of KNOWN_COUNTERS) map[k] = 0
    for (const [k, v] of Object.entries(runDetail.counters)) {
      map[k] = v
    }
    return Object.entries(map).filter(([, val]) => !hideZeros || val > 0)
  }, [runDetail?.counters, hideZeros])

  // Unique results for filtering items
  const uniqueResults = useMemo(() => {
    if (!runDetail?.items) return []
    const counts: Record<string, number> = {}
    for (const item of runDetail.items) {
      counts[item.result] = (counts[item.result] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [runDetail?.items])

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!runDetail?.items) return []
    if (filterResult === 'ALL') return runDetail.items
    return runDetail.items.filter((item) => item.result === filterResult)
  }, [runDetail?.items, filterResult])

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sincronización con el Administrador
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ejecuta corridas de importación de cuotas, conciliación de pagos y auditoría forense.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Reiniciar base de datos a estado cero"
          >
            {resetting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{resetting ? 'Reiniciando...' : 'Borrar datos importados'}</span>
          </button>
        </div>
      </div>

      {/* Action Cards: Import & Reconcile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Importar Cuotas */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Importar Cuotas</span>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Recorre todos los contratos del ISP, normaliza clientes y crea facturas abiertas en Cobrix según los filtros de estado, días de gracia y ventana temporal.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                disabled={syncing !== null}
                onClick={() => handleImport(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {syncing === 'import-sim' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <FlaskConical className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                )}
                <span>Simular Importación</span>
              </button>

              <button
                disabled={syncing !== null}
                onClick={() => handleImport(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-xs shadow-emerald-200 dark:shadow-none cursor-pointer disabled:opacity-50"
              >
                {syncing === 'import-real' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Ejecutar Importación Real</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Card 2: Conciliar Pagos */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Conciliar Pagos</span>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Consulta los pagos registrados en el ISP y actualiza el saldo de las facturas abiertas, marcando como pagadas aquellas que hayan sido saldadas en su totalidad.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                disabled={syncing !== null}
                onClick={() => handleReconcile(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {syncing === 'reconcile-sim' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <FlaskConical className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                )}
                <span>Simular Conciliación</span>
              </button>

              <button
                disabled={syncing !== null}
                onClick={() => handleReconcile(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-xs shadow-emerald-200 dark:shadow-none cursor-pointer disabled:opacity-50"
              >
                {syncing === 'reconcile-real' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Ejecutar Conciliación Real</span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Historial de Corridas */}
      <Card title="Historial Operacional de Sincronizaciones">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
            <span className="text-sm font-medium">Cargando historial de corridas...</span>
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            No se han registrado corridas de sincronización aún.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50/75 dark:bg-slate-800/80">
                <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">ID</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Tipo / Modo</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Fecha (Caracas)</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Duración</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Resultado</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {runs.map((r) => {
                  const parts = parseSummaryBadges(r.summary)

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/70 dark:border-slate-700 shadow-2xs">
                          #{r.id}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={r.type === 'IMPORT' ? 'info' : 'paid'}>
                            {r.type === 'IMPORT' ? 'Importación' : 'Conciliación'}
                          </Badge>
                          {r.is_simulation && (
                            <span className="text-[10px] font-semibold tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
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
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatCaracasDateTime(r.finished_at || r.started_at)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {r.duration_seconds !== undefined
                          ? `${r.duration_seconds}s`
                          : r.started_at && r.finished_at
                          ? `${Math.max(
                              0,
                              Math.round(
                                (new Date(r.finished_at).getTime() -
                                  new Date(r.started_at).getTime()) /
                                  1000
                              )
                            )}s`
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {parts.length > 0 ? (
                            parts.map((part, pIdx) => {
                              const isNegative =
                                part.toLowerCase().includes('fallid') ||
                                part.toLowerCase().includes('error')
                              const isPaid =
                                part.toLowerCase().includes('pagad') ||
                                part.toLowerCase().includes('al día')
                              const isNew =
                                part.toLowerCase().includes('nueva') ||
                                part.toLowerCase().includes('importad')

                              const badgeClass = isNegative
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                                : isPaid
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                                : isNew
                                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60'
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
                              {r.summary || 'Sin observaciones'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAudit(r.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Auditoría</span>
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

      {/* Run Audit Modal */}
      <Modal
        isOpen={selectedRunId !== null}
        onClose={handleCloseModal}
        title={`Auditoría Forense de Corrida #${selectedRunId || ''}`}
        maxWidth="5xl"
        footer={
          <button
            onClick={handleCloseModal}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        }
      >
        {loadingDetail ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
            <span className="text-xs font-medium">Cargando desglose de la corrida...</span>
          </div>
        ) : runDetail ? (
          <div className="space-y-6">
            {/* Run Overview */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={runDetail.run.type === 'IMPORT' ? 'info' : 'paid'}>
                    {runDetail.run.type === 'IMPORT' ? 'Importación' : 'Conciliación'}
                  </Badge>
                  <Badge variant={runDetail.run.is_simulation ? 'neutral' : 'open'}>
                    {runDetail.run.is_simulation ? 'Simulación' : 'Real'}
                  </Badge>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 ml-2">
                    {formatCaracasDateTime(runDetail.run.finished_at || runDetail.run.started_at)}
                  </span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {runDetail.items.length} ítems evaluados
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono tabular-nums">
                {runDetail.run.summary}
              </p>
            </div>

            {/* Bento Grid para Contadores con Soporte de Ocultar Ceros */}
            {displayedCounters.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Contadores de la Corrida ({displayedCounters.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setHideZeros(!hideZeros)}
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
                  >
                    {hideZeros ? 'Mostrar contadores en cero' : 'Ocultar contadores en cero'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {displayedCounters.map(([key, val]) => (
                    <div
                      key={key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        val > 0
                          ? 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <span className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate" title={key}>
                        {key}
                      </span>
                      <span className={`block text-xl font-bold font-mono tabular-nums mt-1 ${val > 0 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Log Table con Filtros y Colores Diferenciados */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Desglose de Ítems Evaluados ({filteredItems.length} de {runDetail.items.length})
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterResult('ALL')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      filterResult === 'ALL'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Todos ({runDetail.items.length})
                  </button>
                  {uniqueResults.map(([res, count]) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setFilterResult(res)}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        filterResult === res
                          ? 'ring-2 ring-emerald-500 font-semibold'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      {getResultBadge(res)}
                      <span className="ml-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">({count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                  No hay ítems con el resultado seleccionado.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800 max-h-[380px]">
                  <table className="w-full text-left text-xs divide-y divide-slate-200/80 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-2xs">
                      <tr className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-4 whitespace-nowrap">Contrato</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Cuota Ext.</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Período</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">Monto</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Resultado</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Motivo / Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                            {item.contract_id ?? '—'}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {item.installment_id ?? '—'}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {item.period ?? '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {item.amount != null
                              ? `USD ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {getResultBadge(item.result)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 max-w-[280px] truncate font-sans" title={item.reason || ''}>
                            {item.reason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-4">No se pudo cargar la información de la corrida.</p>
        )}
      </Modal>

      {/* Confirmation Modal for Reset */}
      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Confirmar Reinicio de Cartera (Sandbox)"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleResetData}
              disabled={resetting}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {resetting ? 'Reiniciando...' : 'Sí, reiniciar base de datos e ISP'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Esta acción eliminará de forma irreversible todas las facturas, contratos, clientes y registros de sincronización de la base de datos de Cobrix, y restablecerá el simulador del ISP a su estado inicial de 27 contratos y cuotas base. La configuración de la empresa y credenciales se mantendrá intacta.
        </p>
      </Modal>
    </div>
  )
}
