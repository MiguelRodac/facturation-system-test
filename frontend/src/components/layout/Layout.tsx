import React from 'react'
import { Navbar, type PageId } from './Navbar'

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
    <div className="app-container">
      <Navbar currentPage={currentPage} onNavigate={onNavigate} companyName={companyName} />
      <main className="main-content">{children}</main>
      <footer
        style={{
          borderTop: '1px solid var(--border-light)',
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          background: '#ffffff',
        }}
      >
        Cobrix Telecom Platform &bull; Arquitectura Hexagonal Desacoplada &bull; API v1 &bull; RFC 9457 Problem Details
      </footer>
    </div>
  )
}
