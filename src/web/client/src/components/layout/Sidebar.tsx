import React, { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  RefreshCw,
  Settings,
  FileCode,
  Server,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react'

export type PageId = 'resumen' | 'clientes' | 'sincronizacion' | 'configuracion'

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  companyName: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  companyName,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  const handleToggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      try {
        localStorage.setItem('cobrix_theme', 'dark')
      } catch {}
    } else {
      document.documentElement.classList.remove('dark')
      try {
        localStorage.setItem('cobrix_theme', 'light')
      } catch {}
    }
  }

  const navItems: Array<{ id: PageId; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'sincronizacion', label: 'Sincronización', icon: RefreshCw },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ]

  return (
    <aside
      className={`fixed inset-y-0 left-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between z-30 select-none transition-all duration-300`}
    >
      {/* Top Header */}
      <div>
        <div
          className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center ${
            isCollapsed ? 'justify-center flex-col gap-3' : 'justify-between'
          }`}
        >
          <div
            onClick={() => onNavigate('resumen')}
            className={`cursor-pointer group flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}
            title="Cobrix Telecom - Sandbox"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-sm shadow-emerald-200 dark:shadow-emerald-950/50 group-hover:from-emerald-500 group-hover:to-teal-300 transition-colors shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M21.5 5.5c-.8.8-2 .9-2.9.3L15 9.4c-.1.1-.3.2-.5.2-.4 0-.8-.3-.8-.8 0-.2.1-.4.2-.5l3.6-3.6c-.6-.9-.5-2.1.3-2.9 1-1 2.6-.9 3.6.1 1 1 1.1 2.6.1 3.6zm-8.8 6.2c.4-.4 1-.4 1.4 0l1.4 1.4c.4.4.4 1 0 1.4l-5 5c-.2.2-.4.3-.7.3H6c-.6 0-1-.4-1-1v-3.8c0-.3.1-.5.3-.7l7.4-7.4z" />
              </svg>
            </div>
            {!isCollapsed && (
              <div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-lg block leading-none">
                  cobrix
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block truncate max-w-[110px] mt-1">
                  {companyName}
                </span>
              </div>
            )}
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Main Navigation Links */}
        <nav className="p-3 space-y-1.5">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Menú Principal
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                } rounded-xl text-sm transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs border border-emerald-200/60 dark:border-emerald-800/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Secondary Navigation / API Docs */}
        <div className="px-3 pt-3 space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Desarrollo & API
            </div>
          )}
          <a
            href={typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4300/docs` : 'http://127.0.0.1:4300/docs'}
            target="_blank"
            rel="noreferrer"
            title={isCollapsed ? 'API Cobrix (Docs)' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            } rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition-colors`}
          >
            <div className="flex items-center gap-2.5">
              <FileCode className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              {!isCollapsed && <span>API Cobrix (Docs)</span>}
            </div>
            {!isCollapsed && <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />}
          </a>

          <a
            href="http://127.0.0.1:4310/docs"
            target="_blank"
            rel="noreferrer"
            title={isCollapsed ? 'API ISP Simulador' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            } rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition-colors`}
          >
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              {!isCollapsed && <span>API ISP (Simulador)</span>}
            </div>
            {!isCollapsed && <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />}
          </a>
        </div>
      </div>

      {/* Bottom Area: Theme Switcher & Footer Status */}
      <div>
        {/* Dark Mode Switch */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleToggleTheme}
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
            } rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer`}
          >
            <div className="flex items-center gap-2.5">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              {!isCollapsed && (
                <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {isDark ? 'Dark' : 'Light'}
              </span>
            )}
          </button>
        </div>

        {/* Footer Status Badge */}
        <div className={`p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 ${isCollapsed ? 'text-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2" title="ISP de Prueba (sandbox : 4310)">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              {!isCollapsed && (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ISP de Prueba
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                Online
              </span>
            )}
          </div>
          {!isCollapsed && (
            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1 pl-4.5">
              sandbox &bull; 4310
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
