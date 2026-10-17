import React, { useEffect, useState, useCallback } from 'react'
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

const PRESET_HOURS = [
  { label: '00:00 (Medianoche)', value: '00:00' },
  { label: '03:00 (Madrugada)', value: '03:00', isRecommended: true },
  { label: '06:00 (Mañana)', value: '06:00' },
  { label: '12:00 (Mediodía)', value: '12:00' },
  { label: '23:00 (Cierre de día)', value: '23:00' },
]

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const urlRegex = /^https?:\/\/.+/
const hourRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

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

  const loadConfig = useCallback(async (isManualRefresh = false) => {
    try {
      const data = await api.getConfig()
      setConfig(data)
      if (isManualRefresh) {
        notify('Parámetros de configuración recargados', 'info')
      }
    } catch (err: unknown) {
      notify((err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Window focus real-time sync
  useEffect(() => {
    const onFocus = () => loadConfig(false)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadConfig])

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

  // Real-time Field Validations
  const errors = {
    company_name: !config.company_name?.trim() ? 'La razón social es obligatoria.' : null,
    company_tax_id: !config.company_tax_id?.trim() ? 'El RIF / Identificación Fiscal es obligatorio.' : null,
    billing_email: !config.billing_email?.trim()
      ? 'El correo de cobranzas es obligatorio.'
      : !emailRegex.test(config.billing_email)
      ? 'Formato de correo electrónico inválido.'
      : null,
    api_url: !config.api_url?.trim()
      ? 'La URL de la API es obligatoria.'
      : !urlRegex.test(config.api_url)
      ? 'La URL debe comenzar con http:// o https://'
      : null,
    api_user: !config.api_user?.trim() ? 'El usuario API es obligatorio.' : null,
    grace_days:
      config.grace_days === null ||
      isNaN(Number(config.grace_days)) ||
      Number(config.grace_days) < 0 ||
      Number(config.grace_days) > 60
        ? 'Los días de gracia deben ser entre 0 y 60.'
        : null,
    importable_statuses:
      !config.importable_statuses || config.importable_statuses.length === 0
        ? 'Debes seleccionar al menos un estado de contrato.'
        : null,
    auto_run_hour:
      !config.auto_run_hour || !hourRegex.test(config.auto_run_hour)
        ? 'Formato de hora inválido (HH:MM).'
        : null,
    import_window_months:
      config.import_window_months !== null &&
      config.import_window_months !== undefined &&
      (isNaN(Number(config.import_window_months)) || Number(config.import_window_months) <= 0)
        ? 'Debe ser mayor a 0 meses.'
        : null,
    max_new_invoices:
      config.max_new_invoices !== null &&
      config.max_new_invoices !== undefined &&
      (isNaN(Number(config.max_new_invoices)) || Number(config.max_new_invoices) <= 0)
        ? 'Debe ser mayor a 0.'
        : null,
    max_new_amount:
      config.max_new_amount !== null &&
      config.max_new_amount !== undefined &&
      (isNaN(Number(config.max_new_amount)) || Number(config.max_new_amount) < 0)
        ? 'Debe ser mayor o igual a 0.'
        : null,
  }

  const isFormValid = Object.values(errors).every((err) => err === null)

  const format12Hour = (timeStr: string) => {
    if (!hourRegex.test(timeStr)) return ''
    const [h, m] = timeStr.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      setConnectionResult(null)
      // Test current form inputs before saving to database
      const res = await api.testConnection({
        api_url: config.api_url,
        api_user: config.api_user,
        api_password: config.api_password || undefined,
      })
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
    if (!isFormValid) {
      notify('Por favor corrige los campos con errores antes de guardar.', 'error')
      return
    }

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
      <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium">Cargando parámetros...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Configuración del Sistema
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Identidad de la empresa, políticas de importación y parámetros de conexión con el ISP.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Company & Rules */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Datos de la Empresa */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Datos de la Empresa</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Razón Social <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.company_name}
                    onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                    className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                      errors.company_name
                        ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                    required
                  />
                  {errors.company_name && (
                    <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                      {errors.company_name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Identificación Fiscal (RIF) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={config.company_tax_id}
                      onChange={(e) => setConfig({ ...config, company_tax_id: e.target.value })}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                        errors.company_tax_id
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                      required
                    />
                    {errors.company_tax_id && (
                      <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                        {errors.company_tax_id}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Correo de Cobranzas <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={config.billing_email}
                      onChange={(e) => setConfig({ ...config, billing_email: e.target.value })}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                        errors.billing_email
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                      required
                    />
                    {errors.billing_email && (
                      <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                        {errors.billing_email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Reglas de Importación */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Filtros y Políticas de Importación</span>
                </div>
              }
            >
              <div className="space-y-5">
                {/* Selectable Chips: Estados de Contrato */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Estados de Contrato a Importar <span className="text-rose-500">*</span>
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
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-200 dark:shadow-none'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {status}
                        </button>
                      )
                    })}
                  </div>
                  {errors.importable_statuses ? (
                    <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1.5">
                      {errors.importable_statuses}
                    </span>
                  ) : (
                    <span className="block text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                      Solo se importarán cuotas de contratos en los estados seleccionados.
                    </span>
                  )}
                </div>

                {/* Selectable Chips: Excluir por tipo de documento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
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
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-200 dark:shadow-none'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {doc}
                        </button>
                      )
                    })}
                  </div>
                  <span className="block text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    Los clientes con estos prefijos de documento (V, E, J, G, P) serán ignorados en la importación.
                  </span>
                </div>

                {/* Días de Gracia y Ventana Deslizante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Días de Gracia para Corte <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={config.grace_days}
                      onChange={(e) => setConfig({ ...config, grace_days: Number(e.target.value) })}
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                        errors.grace_days
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                      required
                    />
                    {errors.grace_days ? (
                      <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                        {errors.grace_days}
                      </span>
                    ) : (
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        Días sumados a la fecha de vencimiento.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
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
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                        errors.import_window_months
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                    {errors.import_window_months ? (
                      <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                        {errors.import_window_months}
                      </span>
                    ) : (
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        Meses hacia atrás a importar (ej. 3, 6, 12).
                      </span>
                    )}
                  </div>
                </div>

                {/* Topes por Corrida */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
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
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                        errors.max_new_invoices
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                    {errors.max_new_invoices && (
                      <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                        {errors.max_new_invoices}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
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
                      className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                        errors.max_new_amount
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                    />
                    {errors.max_new_amount && (
                      <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                        {errors.max_new_amount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* 3. Programación de Corrida Automática con Selector Intuitivo */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Corrida Automática Diaria</span>
                </div>
              }
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                      Ejecución Diaria Programada
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
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
                      config.auto_run_enabled ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        config.auto_run_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Hora de Ejecución Programada (Zona America/Caracas - VET)
                  </label>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {PRESET_HOURS.map((preset) => {
                      const isSelected = config.auto_run_hour === preset.value
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setConfig({ ...config, auto_run_hour: preset.value })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-200 dark:shadow-none'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{preset.label}</span>
                          {preset.isRecommended && (
                            <span className={`ml-1 text-[10px] px-1 py-0.2 rounded font-semibold ${
                              isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              Recomendado
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Native Time Input with 12h & Caracas Display */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                    <div className="w-full sm:w-44">
                      <input
                        type="time"
                        value={config.auto_run_hour ?? '03:00'}
                        onChange={(e) => setConfig({ ...config, auto_run_hour: e.target.value })}
                        className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors cursor-pointer ${
                          errors.auto_run_hour
                            ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                    {config.auto_run_hour && hourRegex.test(config.auto_run_hour) && (
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded">
                          {format12Hour(config.auto_run_hour)}
                        </span>
                        <span>Hora legal de Venezuela (VET, UTC-4)</span>
                      </div>
                    )}
                  </div>
                  {errors.auto_run_hour && (
                    <span className="block text-xs text-rose-500 dark:text-rose-400">
                      {errors.auto_run_hour}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: ISP API Integration & Actions */}
          <div className="lg:col-span-5 space-y-6">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Credenciales API del ISP</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    URL de la API Proveedor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={config.api_url}
                    onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
                    placeholder="http://127.0.0.1:4310"
                    className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                      errors.api_url
                        ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                    required
                  />
                  {errors.api_url && (
                    <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                      {errors.api_url}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Usuario API <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.api_user}
                    onChange={(e) => setConfig({ ...config, api_user: e.target.value })}
                    className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-colors ${
                      errors.api_user
                        ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                    required
                  />
                  {errors.api_user && (
                    <span className="block text-xs text-rose-500 dark:text-rose-400 mt-1">
                      {errors.api_user}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Contraseña API
                  </label>
                  <input
                    type="password"
                    value={config.api_password || ''}
                    onChange={(e) => setConfig({ ...config, api_password: e.target.value })}
                    placeholder="•••••••••••• (dejar vacío para mantener)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Solo llena este campo si deseas cambiar la contraseña actual del ISP.
                  </span>
                </div>

                {/* Test Connection Button & Helper */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={handleTestConnection}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 transition-all cursor-pointer"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500 dark:text-slate-400" />
                        <span>Probando conexión con el ISP...</span>
                      </>
                    ) : (
                      <>
                        <Plug className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Probar Conexión en Vivo</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                    Podés probar los parámetros ingresados arriba antes de guardar.
                  </p>
                </div>

                {/* Connection Status Box */}
                {connectionResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      connectionResult.connected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                        : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {connectionResult.connected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                      <span>
                        {connectionResult.connected ? 'Conexión Exitosa' : 'Fallo en Conexión'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 pl-6">
                      {connectionResult.message}
                      {connectionResult.total_contracts !== undefined && (
                        <span className="block mt-1 font-mono font-semibold text-slate-800 dark:text-slate-100">
                          Total contratos: {connectionResult.total_contracts}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Save Button */}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={saving || !isFormValid}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-md shadow-emerald-200 dark:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              {!isFormValid && (
                <p className="text-xs text-rose-500 dark:text-rose-400 text-center font-medium">
                  Corregí los campos marcados en rojo para poder guardar.
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
