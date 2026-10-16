import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { api } from '../api/client'
import type { CustomerListItem } from '../api/types'

interface CustomersPageProps {
  onSelectCustomer: (id: string) => void
  notify: (text: string, type: 'success' | 'error' | 'info') => void
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Directorio de Clientes</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Consulta de clientes sincronizados, contratos y estado de facturación.
          </p>
        </div>
      </div>

      <Card>
        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre o identificación (ej. V12345678, Comercial, Soto)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <span
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            >
              🔍
            </span>
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            Cargando clientes...
          </p>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No se encontraron clientes</p>
            <p style={{ fontSize: '0.875rem' }}>Prueba con otro término de búsqueda o ejecuta una sincronización.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Identificación</th>
                  <th>Nombre del Cliente</th>
                  <th>Tipo</th>
                  <th>Contratos</th>
                  <th>Facturas Abiertas</th>
                  <th>Facturas Pagadas</th>
                  <th>Deuda Total</th>
                  <th>Vencimiento Antiguo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCustomer(c.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {c.id}
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <Badge variant={c.person_type === 'LEGAL' ? 'info' : 'neutral'}>
                        {c.person_type === 'LEGAL' ? 'Jurídica' : 'Natural'}
                      </Badge>
                    </td>
                    <td>{c.contracts_count}</td>
                    <td>
                      {c.open_invoices_count > 0 ? (
                        <Badge variant="open">{c.open_invoices_count}</Badge>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td>
                      {c.paid_invoices_count > 0 ? (
                        <Badge variant="paid">{c.paid_invoices_count}</Badge>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontWeight: 700, color: c.total_debt > 0 ? '#b45309' : '#047857' }}>
                      ${c.total_debt.toFixed(2)}
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {c.oldest_due_date || '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectCustomer(c.id)
                        }}
                      >
                        Ver Expediente &rarr;
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
  )
}
