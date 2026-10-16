import React from 'react'

export type PageId = 'resumen' | 'clientes' | 'sincronizacion' | 'configuracion'

interface NavbarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  companyName: string
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, companyName }) => {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="brand" onClick={() => onNavigate('resumen')} style={{ cursor: 'pointer' }}>
          <span>⚡ COBRIX</span>
          <span className="brand-badge">SPA React</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {companyName}
          </span>
        </div>

        <div className="nav-links">
          <button
            className={`nav-link ${currentPage === 'resumen' ? 'active' : ''}`}
            onClick={() => onNavigate('resumen')}
          >
            📊 Resumen
          </button>
          <button
            className={`nav-link ${currentPage === 'clientes' ? 'active' : ''}`}
            onClick={() => onNavigate('clientes')}
          >
            👥 Clientes
          </button>
          <button
            className={`nav-link ${currentPage === 'sincronizacion' ? 'active' : ''}`}
            onClick={() => onNavigate('sincronizacion')}
          >
            🔄 Sincronización
          </button>
          <button
            className={`nav-link ${currentPage === 'configuracion' ? 'active' : ''}`}
            onClick={() => onNavigate('configuracion')}
          >
            ⚙️ Configuración
          </button>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
            style={{ color: 'var(--cobrix-blue)', borderLeft: '1px solid var(--border-light)', paddingLeft: '1rem' }}
          >
            📖 Swagger UI
          </a>
          <a
            href="/"
            className="nav-link"
            style={{ color: 'var(--text-muted)' }}
            title="Volver al panel HTML tradicional"
          >
            🖥️ Panel SSR
          </a>
        </div>
      </div>
    </nav>
  )
}
