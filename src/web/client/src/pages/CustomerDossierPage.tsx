import React, { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  FileText,
  Clock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Timeline } from '../components/common/Timeline'
import { api } from '../api/client'
import { formatCaracasDateTime } from '../utils/date'
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
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Cargando expediente del cliente...</p>
      </div>
    )
  }

  if (!dossier) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-slate-500 mb-4">
            No se encontró el expediente del cliente <span className="font-mono tabular-nums font-semibold text-slate-800">{customerId}</span>.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al directorio
          </button>
        </div>
      </Card>
    )
  }

  const { profile, totals, contracts, invoices, timeline } = dossier

  const initials = profile.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'CL'

  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceFilter === 'open') return inv.status === 'OPEN'
    if (invoiceFilter === 'paid') return inv.status === 'PAID'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Clientes
        </button>
      </div>

      {/* Header Profile Card */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {profile.name}
                </h1>
                <Badge variant={profile.person_type === 'LEGAL' ? 'info' : 'neutral'}>
                  {profile.person_type === 'LEGAL' ? 'Persona Jurídica' : 'Persona Natural'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Cédula / RIF:</span>
                  <strong className="font-mono tabular-nums text-slate-800">{profile.id}</strong>
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{profile.phone}</span>
                  </span>
                )}
                {profile.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{profile.email}</span>
                  </span>
                )}
              </div>

              {profile.address && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{profile.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 self-start lg:self-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 text-right">
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                Origen
              </span>
              <div className="text-sm font-semibold text-slate-800">
                {profile.origin || 'ISP Billing API'}
              </div>
              {profile.created_at && (
                <div className="text-[11px] font-mono tabular-nums text-slate-400">
                  Alta: {profile.created_at.split('T')[0]}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deuda Total Activa */}
        <div
          className={`p-4 rounded-xl border shadow-xs transition-colors ${
            totals.total_debt > 0
              ? 'bg-amber-50/40 border-amber-200'
              : 'bg-emerald-50/40 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Deuda Total Activa</span>
            {totals.total_debt > 0 ? (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
              totals.total_debt > 0 ? 'text-amber-900' : 'text-emerald-900'
            }`}
          >
            USD {totals.total_debt.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totals.open_count} factura(s) abierta(s)
          </div>
        </div>

        {/* Facturas Conciliadas */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Facturas Conciliadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 tracking-tight">
            {totals.paid_count}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Pagadas en el ISP
          </div>
        </div>

        {/* Contratos Registrados */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Contratos Registrados</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            {totals.contracts_count}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Servicios contratados
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl max-w-fit">
        <button
          onClick={() => setActiveTab('facturas')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'facturas'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Facturas ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('contratos')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'contratos'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Contratos ({contracts.length})
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'timeline'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Línea de Tiempo ({timeline.length})
        </button>
      </div>

      {/* Tab 1: Facturas */}
      {activeTab === 'facturas' && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setInvoiceFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  invoiceFilter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({invoices.length})
              </button>
              <button
                onClick={() => setInvoiceFilter('open')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  invoiceFilter === 'open'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Abiertas ({totals.open_count})
              </button>
              <button
                onClick={() => setInvoiceFilter('paid')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  invoiceFilter === 'paid'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pagadas ({totals.paid_count})
              </button>
            </div>
            <span className="text-xs text-slate-400">
              Mostrando {filteredInvoices.length} de {invoices.length} factura(s)
            </span>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No hay facturas para el filtro seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-sm divide-y divide-slate-100">
                <thead className="bg-slate-50/75">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4 whitespace-nowrap">Cuota ID</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Período</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Vencimiento</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Corte</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Monto</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Saldo</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Estado</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Recibo / Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600 bg-white">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id || inv.external_installment_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-800">
                        {inv.external_installment_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {inv.period}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                        {inv.due_date}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                        {inv.cutoff_date}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        USD {inv.total_amount.toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 font-mono tabular-nums font-semibold ${
                          inv.balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        USD {inv.balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={inv.status === 'PAID' ? 'paid' : 'open'}>
                            {inv.status === 'PAID' ? 'Pagada' : 'Abierta'}
                          </Badge>
                          {inv.is_partial_payment && (
                            <Badge variant="info">Parcial</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {inv.paid_by_invoice_number ? (
                          <div>
                            <span className="font-mono tabular-nums font-semibold text-slate-800">
                              #{inv.paid_by_invoice_number}
                            </span>
                            {inv.paid_at && (
                              <div className="font-mono tabular-nums text-[11px] text-slate-400">
                                {formatCaracasDateTime(inv.paid_at)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Pendiente</span>
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

      {/* Tab 2: Contratos */}
      {activeTab === 'contratos' && (
        <Card title="Contratos en el administrador">
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50/75">
                <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4 whitespace-nowrap">ID Contrato</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Código</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Plan Contratado</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Tarifa Mensual</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Sucursal</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 bg-white">
                {contracts.map((c) => {
                  const isActivo = c.status === 'ACTIVO'
                  const isCortado = c.status === 'CORTADO'
                  const indicatorClass = isActivo
                    ? 'border-l-4 border-l-emerald-500'
                    : isCortado
                    ? 'border-l-4 border-l-rose-500'
                    : 'border-l-4 border-l-slate-300'

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${indicatorClass}`}
                    >
                      <td className={`py-3 px-4 font-mono tabular-nums font-semibold text-slate-800 ${indicatorClass}`}>
                        {c.id}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-emerald-700">
                        {c.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {c.plan_name}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        USD {c.plan_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.branch_name || 'Principal'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isActivo ? 'paid' : isCortado ? 'error' : 'neutral'}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Línea de Tiempo */}
      {activeTab === 'timeline' && (
        <Card
          title="Hitos Históricos y Auditoría del Cliente"
          description="Trazabilidad de eventos de sincronización, emisión y conciliación"
        >
          <div className="pt-2">
            <Timeline items={timeline} />
          </div>
        </Card>
      )}
    </div>
  )
}
