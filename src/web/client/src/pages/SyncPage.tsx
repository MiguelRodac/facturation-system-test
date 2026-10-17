import React, { useEffect, useState } from 'react'
import {
  Download,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Play,
  FlaskConical,
  Clock,
  Calendar,
  AlertCircle,
  FileCheck,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { api } from '../api/client'
import type { SyncRun, SyncRunDetail } from '../api/types'

interface SyncPageProps {
  notify: (text: string, type: 'success' | 'error' | 'info') => void
}

export const SyncPage: React.FC<SyncPageProps> = ({ notify }) => {
  const [runs, setRuns] = useState<SyncRun[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  // Audit Modal State
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [runDetail, setRunDetail] = useState<SyncRunDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [hideZeros, setHideZeros] = useState(false)

  // Confirm Reset Modal State
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const loadRuns = async () => {
    try {
      setLoading(true)
      const data = await api.getRuns()
      setRuns(data)
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRuns()
  }, [])

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
    notify('Reinicio de datos: Ejecute una importación limpia para sincronizar desde cero.', 'info')
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
        <div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Borrar datos importados</span>
          </button>
        </div>
      </div>

      {/* Action Cards: Import & Reconcile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Importar Cuotas */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-600" />
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
                <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                <span>Simular importación</span>
              </button>
              <button
                disabled={syncing !== null}
                onClick={() => handleImport(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition-all shadow-xs shadow-indigo-200 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Importar cuotas</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Card 2: Actualizar Facturas Pagadas */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-900 text-sm">Actualizar Facturas Pagadas</span>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Revisa el libro de cobros del ISP (<span className="font-mono text-slate-700">pago_informacion</span>) para cada factura abierta en Cobrix y concilia automáticamente las canceladas.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                disabled={syncing !== null}
                onClick={() => handleReconcile(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                <span>Simular conciliación</span>
              </button>
              <button
                disabled={syncing !== null}
                onClick={() => handleReconcile(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-xs shadow-emerald-200 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Actualizar pagadas</span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Historial de Corridas */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-900 text-sm">Historial de Corridas</span>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
            <span className="text-sm">Cargando historial de corridas...</span>
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            No se han registrado corridas de sincronización aún.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Tipo / Modo</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Duración</th>
                  <th className="pb-3 font-medium">Resultado</th>
                  <th className="pb-3 font-medium text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => {
                  const parts = r.summary
                    ? r.summary.split('·').map((p) => p.trim()).filter(Boolean)
                    : []

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-mono tabular-nums text-xs text-slate-400">
                        #{r.id}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={r.type === 'IMPORT' ? 'info' : 'paid'}>
                            {r.type === 'IMPORT' ? 'Importación' : 'Conciliación'}
                          </Badge>
                          {r.is_simulation && <Badge variant="neutral">Sim</Badge>}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant={r.status === 'COMPLETED' ? 'paid' : 'danger'}>
                          {r.status === 'COMPLETED' ? 'Completado' : 'Fallido'}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs font-mono tabular-nums text-slate-600">
                        {r.finished_at || r.started_at}
                      </td>
                      <td className="py-3 text-xs font-mono tabular-nums text-slate-500">
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
                      <td className="py-3">
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
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
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
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleOpenAudit(r.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
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
        title={`Auditoría de Corrida #${selectedRunId || ''}`}
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
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
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
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {hideZeros ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mostrar ceros</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ocultar ceros</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(runDetail.counters)
                    .filter(([, count]) => !hideZeros || count > 0)
                    .map(([key, count]) => {
                      const isZero = count === 0
                      return (
                        <div
                          key={key}
                          className={`p-3 rounded-lg border bg-white shadow-2xs transition-all ${
                            isZero
                              ? 'border-slate-100 opacity-45'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] font-mono tabular-nums text-slate-500 truncate">
                            {key}
                          </div>
                          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                            {count}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Detalle Cuota por Cuota */}
            <div>
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-3">
                Cuotas Evaluadas ({runDetail.items.length})
              </span>
              {runDetail.items.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No se registraron ítems individuales en esta corrida.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr className="text-slate-500 font-semibold">
                        <th className="p-2.5">Contrato</th>
                        <th className="p-2.5">Cuota ID</th>
                        <th className="p-2.5">Período</th>
                        <th className="p-2.5 text-right">Monto</th>
                        <th className="p-2.5">Resultado</th>
                        <th className="p-2.5">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {runDetail.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-mono tabular-nums text-slate-700">
                            {item.contract_id ?? '—'}
                          </td>
                          <td className="p-2.5 font-mono tabular-nums text-slate-500">
                            {item.installment_id ?? '—'}
                          </td>
                          <td className="p-2.5 font-mono tabular-nums font-semibold text-slate-800">
                            {item.period ?? '—'}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums font-bold text-slate-800">
                            {item.amount != null
                              ? `USD ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="p-2.5">
                            <Badge
                              variant={
                                item.result === 'CREATED' || item.result === 'MARKED_PAID'
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
                          <td className="p-2.5 text-slate-500 max-w-[200px] truncate" title={item.reason || ''}>
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
        title="Confirmar Reinicio de Cartera"
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
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Confirmar Reinicio
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Esta acción le permitirá volver a importar toda la cartera desde cero en la siguiente corrida de importación.
        </p>
      </Modal>
    </div>
  )
}
