import React, { useEffect, useState } from 'react'
import {
  Building2,
  Sliders,
  Clock,
  Server,
  Plug,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { api } from '../api/client'
import type { CompanyConfig } from '../api/types'

interface ConfigPageProps {
  onConfigUpdated: (name: string) => void
  notify: (text: string, type: 'success' | 'error' | 'info') => void
}

const AVAILABLE_STATUSES = ['ACTIVO', 'CORTADO', 'RETIRADO', 'SUSPENDIDO']
const AVAILABLE_DOC_TYPES = ['V', 'E', 'J', 'G', 'P']

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
      } catch (err: unknown) {
        notify((err as Error).message, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [notify])

  const toggleStatus = (status: string) => {
    const current = config.importable_statuses || []
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    setConfig({ ...config, importable_statuses: updated })
  }

  const toggleDocType = (docType: string) => {
    const current = config.excluded_doc_types || []
    const updated = current.includes(docType)
      ? current.filter((d) => d !== docType)
      : [...current, docType]
    setConfig({ ...config, excluded_doc_types: updated })
  }

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
        notify(`Conexión exitosa con el ISP (${res.total_contracts} contratos)`, 'success')
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
        excluded_doc_types: config.excluded_doc_types,
        grace_days: Number(config.grace_days),
        import_window_months: config.import_window_months ? Number(config.import_window_months) : null,
        max_recent_installments: config.max_recent_installments ? Number(config.max_recent_installments) : null,
        max_new_invoices: config.max_new_invoices ? Number(config.max_new_invoices) : null,
        max_new_amount: config.max_new_amount ? Number(config.max_new_amount) : null,
        auto_run_hour: config.auto_run_hour,
        auto_run_enabled: config.auto_run_enabled,
      })
      setConfig(updated)
      onConfigUpdated(updated.company_name)
      notify('Parámetros de configuración actualizados correctamente.', 'success')
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Cargando parámetros...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Configuración del Sistema
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Identidad de la empresa, políticas de importación y parámetros de conexión con el ISP.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Company & Rules */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Datos de la Empresa */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-900 text-sm">Datos de la Empresa</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    value={config.company_name}
                    onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Identificación Fiscal (RIF)
                    </label>
                    <input
                      type="text"
                      value={config.company_tax_id}
                      onChange={(e) => setConfig({ ...config, company_tax_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Correo de Cobranzas
                    </label>
                    <input
                      type="email"
                      value={config.billing_email}
                      onChange={(e) => setConfig({ ...config, billing_email: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Reglas de Importación */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-900 text-sm">Filtros y Políticas de Importación</span>
                </div>
              }
            >
              <div className="space-y-5">
                {/* Selectable Chips: Estados de Contrato */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Estados de Contrato a Importar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_STATUSES.map((status) => {
                      const isSelected = config.importable_statuses?.includes(status)
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => toggleStatus(status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono tabular-nums border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {status}
                        </button>
                      )
                    })}
                  </div>
                  <span className="block text-xs text-slate-400 mt-1.5">
                    Solo se importarán cuotas de contratos en los estados seleccionados.
                  </span>
                </div>

                {/* Selectable Chips: Excluir por tipo de documento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Excluir por Tipo de Documento
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_DOC_TYPES.map((doc) => {
                      const isExcluded = config.excluded_doc_types?.includes(doc)
                      return (
                        <button
                          key={doc}
                          type="button"
                          onClick={() => toggleDocType(doc)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono tabular-nums border ${
                            isExcluded
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {doc}
                        </button>
                      )
                    })}
                  </div>
                  <span className="block text-xs text-slate-400 mt-1.5">
                    Los clientes con estos prefijos de documento (V, E, J, G, P) serán ignorados en la importación.
                  </span>
                </div>

                {/* Días de Gracia y Ventana Deslizante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Días de Gracia para Corte
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={config.grace_days}
                      onChange={(e) => setConfig({ ...config, grace_days: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      required
                    />
                    <span className="block text-[11px] text-slate-400 mt-1">
                      Días sumados a la fecha de vencimiento.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Ventana de Importación (Meses)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={config.import_window_months ?? ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          import_window_months: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="Sin límite"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                    <span className="block text-[11px] text-slate-400 mt-1">
                      Meses hacia atrás a importar (3, 6, 9 o 12).
                    </span>
                  </div>
                </div>

                {/* Topes por Corrida */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tope Máx. Facturas Nuevas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={config.max_new_invoices ?? ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          max_new_invoices: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="Sin límite"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tope Máx. Monto Nuevo (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.max_new_amount ?? ''}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          max_new_amount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="Sin límite"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. Programación de Corrida Automática con Toggle Switch */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-900 text-sm">Corrida Automática Diaria</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">
                      Ejecución Diaria Programada
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Ejecuta automáticamente importación y conciliación diaria en background.
                    </span>
                  </div>
                  {/* Tailwind Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.auto_run_enabled}
                    onClick={() => setConfig({ ...config, auto_run_enabled: !config.auto_run_enabled })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                      config.auto_run_enabled ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        config.auto_run_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="max-w-[200px]">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hora de Ejecución (HH:MM)
                  </label>
                  <input
                    type="text"
                    value={config.auto_run_hour ?? '03:00'}
                    onChange={(e) => setConfig({ ...config, auto_run_hour: e.target.value })}
                    placeholder="03:00"
                    pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                  <span className="block text-[11px] text-slate-400 mt-1">
                    Zona horaria America/Caracas.
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: ISP API Integration & Actions */}
          <div className="lg:col-span-5 space-y-6">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-900 text-sm">Credenciales API del ISP</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    URL de la API Proveedor
                  </label>
                  <input
                    type="url"
                    value={config.api_url}
                    onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                    placeholder="http://127.0.0.1:4310"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Usuario API
                  </label>
                  <input
                    type="text"
                    value={config.api_user}
                    onChange={(e) => setConfig({ ...config, api_user: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contraseña API
                  </label>
                  <input
                    type="password"
                    value={config.api_password || ''}
                    onChange={(e) => setConfig({ ...config, api_password: e.target.value })}
                    placeholder="•••••••••••• (dejar vacío para mantener)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Test Connection Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={handleTestConnection}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-all cursor-pointer"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                        <span>Probando conexión con el ISP...</span>
                      </>
                    ) : (
                      <>
                        <Plug className="w-3.5 h-3.5 text-slate-500" />
                        <span>Probar Conexión en Vivo</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Connection Status Box */}
                {connectionResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      connectionResult.connected
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {connectionResult.connected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>
                        {connectionResult.connected ? 'Conexión Exitosa' : 'Fallo en Conexión'}
                      </span>
                    </div>
                    <p className="text-slate-600 pl-6">
                      {connectionResult.message}
                      {connectionResult.total_contracts !== undefined && (
                        <span className="block mt-1 font-mono font-semibold text-slate-800">
                          Total contratos: {connectionResult.total_contracts}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-md shadow-emerald-200 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Parámetros...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Parámetros de Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
