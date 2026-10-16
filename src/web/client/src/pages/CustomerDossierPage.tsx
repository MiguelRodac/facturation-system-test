import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Timeline } from '../components/common/Timeline'
import { api } from '../api/client'
import type { CustomerDossier } from '../api/types'

interface CustomerDossierPageProps {
  customerId: string
  onBack: () => void
  notify: (text: string, type: 'success' | 'error' | 'info') => void
}

type TabId = 'facturas' | 'contratos' | 'timeline'
type InvoiceFilter = 'all' | 'open' | 'paid'

export const CustomerDossierPage: React.FC<CustomerDossierPageProps> = ({
  customerId,
  onBack,
  notify,
}) => {
  const [dossier, setDossier] = useState<CustomerDossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('facturas')
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all')

  useEffect(() => {
    async function loadDossier() {
      try {
        setLoading(true)
        const data = await api.getCustomerDossier(customerId)
        setDossier(data)
      } catch (err: unknown) {
        notify((err as Error).message, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadDossier()
  }, [customerId, notify])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        <p>Cargando expediente del cliente...</p>
      </div>
    )
  }

  if (!dossier) {
    return (
      <Card>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
          No se encontró el expediente del cliente {customerId}.
        </p>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            &larr; Volver al directorio
          </button>
        </div>
      </Card>
    )
  }

  const { profile, totals, contracts, invoices, timeline } = dossier

  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceFilter === 'open') return inv.status === 'OPEN'
    if (invoiceFilter === 'paid') return inv.status === 'PAID'
    return true
  })

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
        >
          &larr; Volver a Clientes
        </button>
      </div>

      {/* Header Profile Card */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{profile.name}</h1>
              <Badge variant={profile.person_type === 'LEGAL' ? 'info' : 'neutral'}>
                {profile.person_type === 'LEGAL' ? 'Persona Jurídica' : 'Persona Natural'}
              </Badge>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <span>
                Cédula / RIF: <strong className="mono">{profile.id}</strong>
              </span>
              {profile.phone && (
                <span>
                  Teléfono: <strong>{profile.phone}</strong>
                </span>
              )}
              {profile.email && (
                <span>
                  Email: <strong>{profile.email}</strong>
                </span>
              )}
            </div>
            {profile.address && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                📍 {profile.address}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Origen de Importación
            </span>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{profile.origin || 'ISP Billing API'}</div>
            {profile.created_at && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Alta: {profile.created_at.split('T')[0]}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Deuda Total Activa</span>
          <span className="metric-value mono" style={{ color: totals.total_debt > 0 ? '#b45309' : '#047857' }}>
            ${totals.total_debt.toFixed(2)}
          </span>
          <span className="metric-sub">{totals.open_count} facturas abiertas</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Facturas Conciliadas</span>
          <span className="metric-value mono" style={{ color: '#047857' }}>
            {totals.paid_count}
          </span>
          <span className="metric-sub">Pagadas en el ISP</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Contratos Registrados</span>
          <span className="metric-value">{totals.contracts_count}</span>
          <span className="metric-sub">Servicios contratados</span>
        </div>
      </div>

      {/* Dossier Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'facturas' ? 'active' : ''}`}
          onClick={() => setActiveTab('facturas')}
        >
          📄 Facturas ({invoices.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'contratos' ? 'active' : ''}`}
          onClick={() => setActiveTab('contratos')}
        >
          📑 Contratos ({contracts.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          ⏱️ Línea de Tiempo ({timeline.length})
        </button>
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'facturas' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${invoiceFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setInvoiceFilter('all')}
              >
                Todas ({invoices.length})
              </button>
              <button
                className={`btn ${invoiceFilter === 'open' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setInvoiceFilter('open')}
              >
                Abiertas ({totals.open_count})
              </button>
              <button
                className={`btn ${invoiceFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setInvoiceFilter('paid')}
              >
                Pagadas ({totals.paid_count})
              </button>
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Mostrando {filteredInvoices.length} factura(s)
            </span>
          </div>

          {filteredInvoices.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              No hay facturas para el filtro seleccionado.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Cuota ID</th>
                    <th>Período</th>
                    <th>Vencimiento</th>
                    <th>Corte</th>
                    <th>Monto</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Recibo / Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id || inv.external_installment_id}>
                      <td className="mono">{inv.external_installment_id}</td>
                      <td style={{ fontWeight: 600 }}>{inv.period}</td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{inv.due_date}</td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{inv.cutoff_date}</td>
                      <td className="mono">${inv.total_amount.toFixed(2)}</td>
                      <td className="mono" style={{ fontWeight: 700, color: inv.balance > 0 ? '#b45309' : '#047857' }}>
                        ${inv.balance.toFixed(2)}
                      </td>
                      <td>
                        <Badge variant={inv.status === 'PAID' ? 'paid' : 'open'}>
                          {inv.status === 'PAID' ? 'Pagada' : 'Abierta'}
                        </Badge>
                        {inv.is_partial_payment && (
                          <span style={{ marginLeft: '0.35rem' }}>
                            <Badge variant="info">Parcial</Badge>
                          </span>
                        )}
                      </td>
                      <td>
                        {inv.paid_by_invoice_number ? (
                          <div style={{ fontSize: '0.8rem' }}>
                            <span className="mono" style={{ fontWeight: 600 }}>#{inv.paid_by_invoice_number}</span>
                            {inv.paid_at && <div style={{ color: 'var(--text-muted)' }}>{inv.paid_at}</div>}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Pendiente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Contracts */}
      {activeTab === 'contratos' && (
        <Card>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID Contrato</th>
                  <th>Código</th>
                  <th>Plan Contratado</th>
                  <th>Tarifa Mensual</th>
                  <th>Sucursal</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{c.code}</td>
                    <td style={{ fontWeight: 600 }}>{c.plan_name}</td>
                    <td className="mono">${c.plan_price.toFixed(2)} USD</td>
                    <td>{c.branch_name || 'Principal'}</td>
                    <td>
                      <Badge variant={c.status === 'ACTIVO' ? 'paid' : 'neutral'}>
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Timeline */}
      {activeTab === 'timeline' && (
        <Card title="Hitos Históricos y Auditoría del Cliente">
          <Timeline items={timeline} />
        </Card>
      )}
    </div>
  )
}
