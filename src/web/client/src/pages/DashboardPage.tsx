import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { api } from '../api/client'
import type { CustomerListItem, SyncRun } from '../api/types'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [custList, runList] = await Promise.all([
          api.getCustomers(),
          api.getRuns(),
        ])
        setCustomers(custList)
        setRuns(runList)
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
  const topDebtors = [...customers].sort((a, b) => b.total_debt - a.total_debt).slice(0, 5)
  const lastRun = runs.length > 0 ? runs[0] : null

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        <p>Cargando panel operacional...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Panel de Control Operacional</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Estado en tiempo real de facturación, sincronización y cobranzas del ISP.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('sincronizacion')}>
            🔄 Sincronizar Ahora
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Clientes Registrados</span>
          <span className="metric-value">{customers.length}</span>
          <span className="metric-sub">Cartera sincronizada</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Deuda Total Activa</span>
          <span className="metric-value mono" style={{ color: '#b45309' }}>
            ${totalDebt.toFixed(2)}
          </span>
          <span className="metric-sub">{totalOpenInvoices} facturas abiertas</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Facturas Conciliadas</span>
          <span className="metric-value mono" style={{ color: '#047857' }}>
            {totalPaidInvoices}
          </span>
          <span className="metric-sub">Pagos acreditados en ISP</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Última Sincronización</span>
          <div style={{ marginTop: '0.25rem' }}>
            {lastRun ? (
              <>
                <Badge variant={lastRun.status === 'COMPLETED' ? 'paid' : 'danger'}>
                  {lastRun.type} {lastRun.is_simulation ? '(SIM)' : ''}
                </Badge>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {lastRun.finished_at || lastRun.started_at}
                </div>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sin corridas</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        {/* Top Debtors */}
        <Card
          title="Top Clientes con Mayor Deuda"
          action={
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              onClick={() => onNavigate('clientes')}
            >
              Ver todos
            </button>
          }
        >
          {topDebtors.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No hay clientes registrados o con deuda activa.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Identificación</th>
                    <th>Facturas</th>
                    <th>Deuda Total</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {topDebtors.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td className="mono">{c.id}</td>
                      <td>
                        <Badge variant="open">{c.open_invoices_count} abiertas</Badge>
                      </td>
                      <td className="mono" style={{ fontWeight: 700, color: '#b45309' }}>
                        ${c.total_debt.toFixed(2)}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => onSelectCustomer(c.id)}
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

        {/* Sync Summary & Quick Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card title="Motor de Sincronización Automática">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              El planificador en background verifica el estado del ISP periódicamente según la hora configurada (03:00 AM).
            </p>
            <div style={{ background: '#f8fafc', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>ESTADO DEL CRON</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Activo (Consola: [SYNC ENGINE])</span>
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.8125rem' }}
                onClick={() => onNavigate('sincronizacion')}
              >
                Historial de Corridas
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.8125rem' }}
                onClick={() => onNavigate('configuracion')}
              >
                Parámetros ISP
              </button>
            </div>
          </Card>

          <Card title="Arquitectura Hexagonal & RFC 9457">
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Cobrix implementa repositorios de tabla única, enriquecimiento desacoplado y estándar RFC 9457 Problem Details en todos los errores.
            </p>
            <div style={{ marginTop: '0.75rem' }}>
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                Explorar catálogo en Swagger UI &rarr;
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
