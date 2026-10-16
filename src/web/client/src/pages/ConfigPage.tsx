import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { api } from '../api/client'
import type { CompanyConfig } from '../api/types'

interface ConfigPageProps {
  onConfigUpdated: (name: string) => void
  notify: (text: string, type: 'success' | 'error' | 'info') => void
}

export const ConfigPage: React.FC<ConfigPageProps> = ({ onConfigUpdated, notify }) => {
  const [config, setConfig] = useState<CompanyConfig>({
    company_name: '',
    company_tax_id: '',
    billing_email: '',
    api_url: '',
    api_user: '',
    api_password: '',
    importable_statuses: ['ACTIVO', 'CORTADO'],
    import_window_months: null,
    max_recent_installments: null,
    grace_days: 5,
    max_new_invoices: null,
    max_new_amount: null,
    excluded_doc_types: [],
    auto_run_hour: '03:00',
    auto_run_enabled: false,
  })

  const [importableStatusesInput, setImportableStatusesInput] = useState('ACTIVO, CORTADO')
  const [excludedDocsInput, setExcludedDocsInput] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    connected: boolean
    message: string
    total_contracts?: number
  } | null>(null)

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true)
        const data = await api.getConfig()
        setConfig(data)
        if (Array.isArray(data.importable_statuses)) {
          setImportableStatusesInput(data.importable_statuses.join(', '))
        }
        if (Array.isArray(data.excluded_doc_types)) {
          setExcludedDocsInput(data.excluded_doc_types.join(', '))
        }
      } catch (err: unknown) {
        notify((err as Error).message, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [notify])

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setConnectionResult(null)
      const res = await api.testConnection()
      const isConnected = Boolean(res.connected || res.ok)
      setConnectionResult({
        connected: isConnected,
        message: res.message,
        total_contracts: res.total_contracts,
      })
      if (isConnected) {
        notify(`Conexión exitosa con el ISP: ${res.message}`, 'success')
      } else {
        notify(`Fallo en conexión: ${res.message}`, 'error')
      }
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const importableStatuses = importableStatusesInput
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
      const excludedDocs = excludedDocsInput
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)

      const updated = await api.updateConfig({
        company_name: config.company_name,
        company_tax_id: config.company_tax_id,
        billing_email: config.billing_email,
        api_url: config.api_url,
        api_user: config.api_user,
        api_password: config.api_password || undefined,
        importable_statuses: importableStatuses,
        excluded_doc_types: excludedDocs,
        grace_days: Number(config.grace_days),
        import_window_months: config.import_window_months ? Number(config.import_window_months) : null,
        max_recent_installments: config.max_recent_installments ? Number(config.max_recent_installments) : null,
        max_new_invoices: config.max_new_invoices ? Number(config.max_new_invoices) : null,
        max_new_amount: config.max_new_amount ? Number(config.max_new_amount) : null,
        auto_run_hour: config.auto_run_hour,
        auto_run_enabled: config.auto_run_enabled,
      })
      setConfig(updated)
      if (Array.isArray(updated.importable_statuses)) {
        setImportableStatusesInput(updated.importable_statuses.join(', '))
      }
      if (Array.isArray(updated.excluded_doc_types)) {
        setExcludedDocsInput(updated.excluded_doc_types.join(', '))
      }
      onConfigUpdated(updated.company_name)
      notify('Configuración guardada exitosamente.', 'success')
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        <p>Cargando parámetros de configuración...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Configuración del Sistema</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Parámetros de empresa, políticas de facturación y credenciales de la API del ISP.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          {/* Company & Billing Rules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card title="Datos de la Empresa">
              <div className="form-group">
                <label className="form-label">Nombre de la Empresa</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.company_name}
                  onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Identificación Fiscal (RIF)</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={config.company_tax_id}
                    onChange={(e) => setConfig({ ...config, company_tax_id: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo de Cobranzas</label>
                  <input
                    type="email"
                    className="form-input"
                    value={config.billing_email}
                    onChange={(e) => setConfig({ ...config, billing_email: e.target.value })}
                    required
                  />
                </div>
              </div>
            </Card>

            <Card title="Reglas y Filtros de Importación">
              <div className="form-group">
                <label className="form-label">Estados de Contrato Importables</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={importableStatusesInput}
                  onChange={(e) => setImportableStatusesInput(e.target.value)}
                  placeholder="ACTIVO, CORTADO"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Separados por coma. Contratos en otros estados (ej. RETIRADO) serán ignorados.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Tipos de Documento Excluidos</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={excludedDocsInput}
                  onChange={(e) => setExcludedDocsInput(e.target.value)}
                  placeholder="J, G (opcional)"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Separados por coma (ej. J, G). Déjelo vacío para importar todos los tipos.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Días de Gracia para Corte</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="form-input mono"
                    value={config.grace_days}
                    onChange={(e) => setConfig({ ...config, grace_days: Number(e.target.value) })}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Días sumados a la fecha de vencimiento.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Ventana Deslizante (Meses)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input mono"
                    value={config.import_window_months ?? ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        import_window_months: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Sin límite"
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Meses hacia atrás a importar (vacío = sin límite).
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Tope Máx. Facturas Nuevas</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input mono"
                    value={config.max_new_invoices ?? ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        max_new_invoices: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Sin límite"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tope Máx. Monto Nuevo (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input mono"
                    value={config.max_new_amount ?? ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        max_new_amount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Sin límite"
                  />
                </div>
              </div>
            </Card>

            <Card title="Programación de Corrida Automática">
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="auto_run_enabled"
                  checked={config.auto_run_enabled}
                  onChange={(e) => setConfig({ ...config, auto_run_enabled: e.target.checked })}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <label htmlFor="auto_run_enabled" style={{ fontWeight: 600, cursor: 'pointer' }}>
                  Habilitar sincronización automática diaria en background
                </label>
              </div>

              <div className="form-group" style={{ maxWidth: '200px' }}>
                <label className="form-label">Hora de Ejecución (HH:MM)</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={config.auto_run_hour ?? '03:00'}
                  onChange={(e) => setConfig({ ...config, auto_run_hour: e.target.value })}
                  placeholder="03:00"
                  pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Zona horaria America/Caracas.
                </span>
              </div>
            </Card>
          </div>

          {/* ISP Integration & Testing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card title="Integración con la API del ISP">
              <div className="form-group">
                <label className="form-label">URL Base de la API del ISP</label>
                <input
                  type="url"
                  className="form-input mono"
                  value={config.api_url}
                  onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                  placeholder="http://127.0.0.1:4310"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Usuario de la API</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={config.api_user}
                  onChange={(e) => setConfig({ ...config, api_user: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña de la API</label>
                <input
                  type="password"
                  className="form-input mono"
                  value={config.api_password || ''}
                  onChange={(e) => setConfig({ ...config, api_password: e.target.value })}
                  placeholder="•••••••••••• (dejar vacío para mantener)"
                />
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  disabled={testing}
                  onClick={handleTestConnection}
                >
                  {testing ? '⏳ Probando conexión...' : '🔌 Probar Conexión en Vivo'}
                </button>
              </div>

              {connectionResult && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: connectionResult.connected ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${connectionResult.connected ? '#a7f3d0' : '#fecaca'}`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: connectionResult.connected ? '#047857' : '#b91c1c',
                    }}
                  >
                    {connectionResult.connected ? '✅ Conexión Exitosa' : '❌ Error de Conexión'}
                    {connectionResult.total_contracts !== undefined &&
                      ` (${connectionResult.total_contracts} contratos disponibles)`}
                  </div>
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                    {connectionResult.message}
                  </div>
                </div>
              )}
            </Card>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.875rem', fontSize: '1rem', fontWeight: 700 }}
              disabled={saving}
            >
              {saving ? '⏳ Guardando cambios...' : '💾 Guardar Parámetros de Configuración'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
