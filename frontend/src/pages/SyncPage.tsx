import React, { useEffect, useState } from 'react'
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
  const [isSimulate, setIsSimulate] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  // Audit Modal State
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [runDetail, setRunDetail] = useState<SyncRunDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

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

  const handleImport = async () => {
    try {
      setSyncing('import')
      notify(`Iniciando importación de cuotas (${isSimulate ? 'Simulación' : 'Real'})...`, 'info')
      const res = await api.importInstallments(isSimulate)
      notify(
        `Importación completada: ${res.imported_customers_count} clientes, ${res.imported_invoices_count} facturas (${res.duration_seconds}s)`,
        'success'
      )
      await loadRuns()
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setSyncing(null)
    }
  }

  const handleReconcile = async () => {
    try {
      setSyncing('reconcile')
      notify(`Iniciando conciliación de pagos (${isSimulate ? 'Simulación' : 'Real'})...`, 'info')
      const res = await api.reconcilePayments(isSimulate)
      notify(
        `Conciliación completada: ${res.paid_invoices_count} facturas pagadas, ${res.partial_payments_count} pagos parciales (${res.duration_seconds}s)`,
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Centro de Sincronización</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Ejecución manual de importación, conciliación y auditoría de corridas.
          </p>
        </div>
      </div>

      {/* Action Controls Card */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Simulation Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isSimulate}
                onChange={(e) => setIsSimulate(e.target.checked)}
                style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--cobrix-blue)' }}
              />
              <span>Modo Simulación (Dry-Run)</span>
            </label>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {isSimulate
                ? 'ℹ️ Evalúa reglas de negocio sin persistir cambios en la base de datos.'
                : '⚡ Aplica los cambios directamente en las tablas de Cobrix.'}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              disabled={syncing !== null}
              onClick={handleImport}
            >
              {syncing === 'import' ? '⏳ Importando...' : '📥 Importar Cuotas del ISP'}
            </button>
            <button
              className="btn btn-success"
              disabled={syncing !== null}
              onClick={handleReconcile}
            >
              {syncing === 'reconcile' ? '⏳ Conciliando...' : '💳 Actualizar / Conciliar Pagadas'}
            </button>
          </div>
        </div>
      </Card>

      {/* Sync Runs History */}
      <Card title="Historial de Corridas de Sincronización">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            Cargando historial de sincronizaciones...
          </p>
        ) : runs.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            No se han registrado corridas de sincronización aún.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Modo</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Duración</th>
                  <th>Procesados</th>
                  <th>Creados / Pagados</th>
                  <th>Fallidos</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>#{r.id}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>
                        {r.type === 'IMPORT' ? '📥 IMPORTACIÓN' : '💳 CONCILIACIÓN'}
                      </span>
                    </td>
                    <td>
                      <Badge variant={r.is_simulation ? 'info' : 'neutral'}>
                        {r.is_simulation ? 'SIMULACIÓN' : 'REAL'}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={r.status === 'COMPLETED' ? 'paid' : 'danger'}>
                        {r.status === 'COMPLETED' ? 'Completado' : 'Fallido'}
                      </Badge>
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {r.started_at ? r.started_at.replace('T', ' ').split('.')[0] : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem' }}>
                      {r.duration_seconds}s
                    </td>
                    <td className="mono">{r.counts.total}</td>
                    <td className="mono" style={{ color: '#047857', fontWeight: 600 }}>
                      {r.type === 'IMPORT' ? r.counts.created : r.counts.paid}
                    </td>
                    <td className="mono" style={{ color: r.counts.failed > 0 ? '#b91c1c' : 'inherit' }}>
                      {r.counts.failed}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => handleOpenAudit(r.id)}
                      >
                        🔍 Ver Auditoría
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Audit Modal */}
      <Modal
        isOpen={selectedRunId !== null}
        onClose={handleCloseModal}
        title={`Auditoría Cuota por Cuota - Corrida #${selectedRunId || ''}`}
        footer={
          <button className="btn btn-secondary" onClick={handleCloseModal}>
            Cerrar
          </button>
        }
      >
        {loadingDetail ? (
          <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            Cargando desglose de la corrida...
          </p>
        ) : runDetail ? (
          <div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                <div>
                  <strong>Tipo:</strong> {runDetail.run.type}
                </div>
                <div>
                  <strong>Modo:</strong> {runDetail.run.is_simulation ? 'Simulación' : 'Real'}
                </div>
                <div>
                  <strong>Total Ítems Evaluados:</strong> {runDetail.items.length}
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <strong>Resumen:</strong> {runDetail.run.summary}
              </div>
            </div>

            {runDetail.items.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                No hay ítems registrados en esta corrida.
              </p>
            ) : (
              <div className="table-wrapper" style={{ maxHeight: '400px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Contrato</th>
                      <th>Cuota ID</th>
                      <th>Período</th>
                      <th>Monto</th>
                      <th>Resultado</th>
                      <th>Motivo / Razón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runDetail.items.map((item) => (
                      <tr key={item.id}>
                        <td className="mono">{item.contract_id}</td>
                        <td className="mono">{item.installment_id}</td>
                        <td style={{ fontWeight: 600 }}>{item.period}</td>
                        <td className="mono">${item.amount.toFixed(2)}</td>
                        <td>
                          <Badge
                            variant={
                              item.result === 'CREATED' || item.result === 'MARKED_PAID'
                                ? 'paid'
                                : item.result === 'SIMULATED_NEW' || item.result === 'SIMULATED_PAID'
                                ? 'info'
                                : 'neutral'
                            }
                          >
                            {item.result}
                          </Badge>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {item.reason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No se encontraron datos.</p>
        )}
      </Modal>
    </div>
  )
}
