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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-sm shadow-emerald-200 group-hover:from-emerald-500 group-hover:to-teal-300 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5v-3.5h-2v3.5l-4-4 1.41-1.41L11 13.67V7.5h2v6.17l2.59-2.58L17 12.5l-4 4z" opacity="0" />
                  <path d="M21.71 8.29l-4-4a1 1 0 0 0-1.42 0l-11 11a1 1 0 0 0 0 1.42l4 4a1 1 0 0 0 1.42 0l11-11a1 1 0 0 0 0-1.42zM12 18.59l-2.59-2.59 7.3-7.29 2.58 2.58-7.29 7.3z" opacity="0"/>
                  <path d="M21.5 5.5c-.8.8-2 .9-2.9.3L15 9.4c-.1.1-.3.2-.5.2-.4 0-.8-.3-.8-.8 0-.2.1-.4.2-.5l3.6-3.6c-.6-.9-.5-2.1.3-2.9 1-1 2.6-.9 3.6.1 1 1 1.1 2.6.1 3.6zm-8.8 6.2c.4-.4 1-.4 1.4 0l1.4 1.4c.4.4.4 1 0 1.4l-5 5c-.2.2-.4.3-.7.3H6c-.6 0-1-.4-1-1v-3.8c0-.3.1-.5.3-.7l7.4-7.4z" />
                </svg>
              </div>
              <div>
                <span className="font-extrabold text-slate-900 tracking-tight text-lg block leading-none">
                  cobrix
                </span>
                <span className="text-[11px] text-slate-400 font-medium block truncate max-w-[130px] mt-1">
                  {companyName}
                </span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 rounded border border-emerald-200/80 uppercase">
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
                    ? 'bg-emerald-50/80 text-emerald-800 font-semibold border-r-2 border-emerald-500 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-600' : 'text-slate-400'
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
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors"
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
