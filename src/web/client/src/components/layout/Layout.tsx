import React from 'react'
import { Sidebar, type PageId } from './Sidebar'

interface LayoutProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  companyName: string
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  onNavigate,
  companyName,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        companyName={companyName}
      />
      <div className="flex-1 flex flex-col min-w-0 pl-64">
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <footer className="border-t border-slate-200/80 py-4 px-8 text-center text-xs text-slate-400 bg-white/40">
          Cobrix Telecom Platform &bull; Arquitectura Hexagonal &bull; REST API v1 &bull; RFC 9457 Problem Details
        </footer>
      </div>
    </div>
  )
}
