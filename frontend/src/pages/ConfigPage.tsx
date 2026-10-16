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
    importable_statuses: '',
    grace_days: 5,
    auto_run_hour: '03:00',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    connected: boolean
    message: string
    http_status: number
  } | null>(null)

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true)
        const data = await api.getConfig()
        setConfig(data)
      } catch (err: unknown) {
        notify((err as Error).message, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [notify])

  const handleChange = (field: keyof CompanyConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setConnectionResult(null)
      const res = await api.testConnection()
      setConnectionResult(res)
      if (res.connected) {
        notify(`Conexión exitosa con el ISP (HTTP ${res.http_status}): ${res.message}`, 'success')
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
      const updated = await api.updateConfig({
        company_name: config.company_name,
        company_tax_id: config.company_tax_id,
        billing_email: config.billing_email,
        api_url: config.api_url,
        api_user: config.api_user,
        api_password: config.api_password || undefined,
        importable_statuses: config.importable_statuses,
        grace_days: Number(config.grace_days),
        auto_run_hour: config.auto_run_hour,
      })
      setConfig(updated)
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
                  onChange={(e) => handleChange('company_name', e.target.value)}
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
                    onChange={(e) => handleChange('company_tax_id', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo de Cobranzas</label>
                  <input
                    type="email"
                    className="form-input"
                    value={config.billing_email}
                    onChange={(e) => handleChange('billing_email', e.target.value)}
                    required
                  />
                </div>
              </div>
            </Card>

            <Card title="Reglas y Políticas de Facturación">
              <div className="form-group">
                <label className="form-label">Estados de Contrato Importables</label>
                <input
                  type="text"
                  className="form-input mono"
                  value={config.importable_statuses}
                  onChange={(e) => handleChange('importable_statuses', e.target.value)}
                  placeholder="ACTIVO,CORTADO"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Separados por coma. Contratos en otros estados (ej. RETIRADO) serán ignorados.
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
                    onChange={(e) => handleChange('grace_days', Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Días sumados a la fecha de vencimiento.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Hora de Corrida Automática</label>
                  <input
                    type="text"
                    className="form-input mono"
                    value={config.auto_run_hour}
                    onChange={(e) => handleChange('auto_run_hour', e.target.value)}
                    placeholder="03:00"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Formato HH:MM (ej. 03:00).
                  </span>
                </div>
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
                  onChange={(e) => handleChange('api_url', e.target.value)}
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
                  onChange={(e) => handleChange('api_user', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña de la API</label>
                <input
                  type="password"
                  className="form-input mono"
                  value={config.api_password || ''}
                  onChange={(e) => handleChange('api_password', e.target.value)}
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
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: connectionResult.connected ? '#047857' : '#b91c1c' }}>
                    {connectionResult.connected ? '✅ Conexión Exitosa' : '❌ Error de Conexión'} (HTTP {connectionResult.http_status})
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
