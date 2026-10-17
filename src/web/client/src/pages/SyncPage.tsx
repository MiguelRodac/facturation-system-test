import React, { useEffect, useState, useCallback } from 'react'
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
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { api } from '../api/client'
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sincronización con el Administrador
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ejecuta corridas de importación de cuotas, conciliación de pagos y auditoría forense.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadRuns(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Refrescar historial ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Refrescar</span>
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
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
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-900 text-sm">Importar Cuotas</span>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Recorre todos los contratos del ISP, normaliza clientes y crea facturas abiertas en Cobrix según los filtros de estado, días de gracia y ventana temporal.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                disabled={syncing !== null}
                onClick={() => handleImport(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {syncing === 'import-sim' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Simular Importación</span>
              </button>

              <button
                disabled={syncing !== null}
                onClick={() => handleImport(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-xs shadow-emerald-200 cursor-pointer disabled:opacity-50"
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-900 text-sm">Conciliar Pagos</span>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspecciona el libro de pagos del ISP para cada contrato con facturas abiertas. Detecta pagos totales, pagos parciales y asocia el número de comprobante.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                disabled={syncing !== null}
                onClick={() => handleReconcile(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {syncing === 'reconcile-sim' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Simular Conciliación</span>
              </button>

              <button
                disabled={syncing !== null}
                onClick={() => handleReconcile(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-xs shadow-emerald-200 cursor-pointer disabled:opacity-50"
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
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50/75">
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">ID</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Tipo / Modo</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Fecha</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Duración</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Resultado</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {runs.map((r) => {
                  const parts = parseSummaryBadges(r.summary)

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-400 whitespace-nowrap">
                        #{r.id}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={r.type === 'IMPORT' ? 'info' : 'paid'}>
                            {r.type === 'IMPORT' ? 'Importación' : 'Conciliación'}
                          </Badge>
                          {r.is_simulation && <Badge variant="neutral">Sim</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={r.status === 'COMPLETED' ? 'paid' : 'danger'}>
                          {r.status === 'COMPLETED' ? 'Completado' : 'Fallido'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {r.finished_at || r.started_at}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
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
                              {r.summary || 'Sin observaciones'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAudit(r.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={runDetail.run.type === 'IMPORT' ? 'info' : 'paid'}>
                    {runDetail.run.type === 'IMPORT' ? 'Importación' : 'Conciliación'}
                  </Badge>
                  <Badge variant={runDetail.run.is_simulation ? 'neutral' : 'open'}>
                    {runDetail.run.is_simulation ? 'Simulación' : 'Real'}
                  </Badge>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {runDetail.items.length} ítems evaluados
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-mono tabular-nums">
                {runDetail.run.summary}
              </p>
            </div>

            {/* Bento Grid de 3 columnas para Contadores */}
            {runDetail.counters && Object.keys(runDetail.counters).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contadores de la Corrida
                  </span>
                  <button
                    type="button"
                    onClick={() => setHideZeros(!hideZeros)}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    {hideZeros ? 'Mostrar contadores en cero' : 'Ocultar contadores en cero'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.entries(runDetail.counters)
                    .filter(([, val]) => !hideZeros || val > 0)
                    .map(([key, val]) => (
                      <div
                        key={key}
                        className="p-3 bg-white rounded-lg border border-slate-200/70 shadow-xs"
                      >
                        <span className="block text-[11px] font-mono text-slate-400 truncate" title={key}>
                          {key}
                        </span>
                        <span className="block text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                          {val}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Audit Log Table */}
            <div>
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-3">
                Desglose de Ítems Evaluados ({runDetail.items.length})
              </span>
              {runDetail.items.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Esta corrida no generó ítems detallados.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200/80 max-h-96">
                  <table className="w-full text-left text-xs divide-y divide-slate-200/80">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr className="text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-4 whitespace-nowrap">Contrato</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Cuota Ext.</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Período</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">Monto</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Resultado</th>
                        <th className="py-2.5 px-4 whitespace-nowrap">Motivo / Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {runDetail.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {item.contract_id ?? '—'}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                            {item.installment_id ?? '—'}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-slate-800 whitespace-nowrap">
                            {item.period ?? '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-800 whitespace-nowrap">
                            {item.amount != null
                              ? `USD ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <Badge
                              variant={
                                item.result === 'CREATED' || item.result === 'MARKED_PAID' || item.result === 'IMPORTED'
                                  ? 'paid'
                                  : item.result === 'SIMULATED_NEW' ||
                                    item.result === 'SIMULATED_PAID'
                                  ? 'info'
                                  : 'neutral'
                              }
                            >
                              {item.result}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 max-w-[240px] truncate" title={item.reason || ''}>
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
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleResetData}
              disabled={resetting}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {resetting ? 'Reiniciando...' : 'Sí, reiniciar base de datos'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Esta acción eliminará de forma irreversible todas las facturas, contratos, clientes y registros de sincronización de la base de datos de Cobrix, permitiéndote reiniciar las pruebas desde cero (sandbox limpio). La configuración de la empresa y del ISP se mantendrá intacta.
        </p>
      </Modal>
    </div>
  )
}
