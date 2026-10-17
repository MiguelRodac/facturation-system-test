import React from 'react'
import {
  LayoutDashboard,
  Users,
  RefreshCw,
  Settings,
  FileCode,
  ExternalLink,
  Zap,
} from 'lucide-react'

export type PageId = 'resumen' | 'clientes' | 'sincronizacion' | 'configuracion'

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  companyName: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  companyName,
}) => {
  const navItems: Array<{ id: PageId; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'sincronizacion', label: 'Sincronización', icon: RefreshCw },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ]

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col justify-between z-30 select-none">
      {/* Top Header */}
      <div>
        <div className="p-6 border-b border-slate-100">
          <div
            onClick={() => onNavigate('resumen')}
            className="cursor-pointer group flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-base block leading-none">
                  COBRIX
                </span>
                <span className="text-[11px] text-slate-400 font-medium block truncate max-w-[130px] mt-1">
                  {companyName}
                </span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide bg-indigo-50 text-indigo-700 rounded border border-indigo-200/60 uppercase">
              Sandbox
            </span>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menú Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                  isActive
                    ? 'bg-indigo-50/80 text-indigo-600 font-semibold border-r-2 border-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Secondary Navigation / API Docs */}
        <div className="px-3 pt-4 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Desarrollo & API
          </div>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>Swagger UI</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Footer Status Badge */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-700">
              ISP de Prueba
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
            Online
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 mt-1 pl-4">
          sandbox &bull; 4310
        </div>
      </div>
    </aside>
  )
}
