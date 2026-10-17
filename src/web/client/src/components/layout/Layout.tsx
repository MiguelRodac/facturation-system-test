import React from 'react'
import { Sidebar, type PageId } from './Sidebar'

interface LayoutProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  companyName: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  onNavigate,
  companyName,
  isCollapsed = false,
  onToggleCollapse,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex transition-colors duration-200">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        companyName={companyName}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'pl-20' : 'pl-64'}`}>
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        {/* Modern Fintech SaaS Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-4 px-8 text-xs text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">cobrix</span>
              <span className="font-mono text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                v1.0.0
              </span>
              <span className="text-slate-400 dark:text-slate-600">&bull;</span>
              <span>Sandbox de Facturación &amp; Cobranzas</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                Arquitectura Hexagonal
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                RFC 9457
              </span>
              <span className="font-mono text-slate-400 dark:text-slate-500">
                Zona horaria: VET (UTC-4 Caracas)
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
