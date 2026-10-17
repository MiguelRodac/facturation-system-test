import React, { useEffect, useState, useCallback } from 'react'
import { Layout } from './components/layout/Layout'
import type { PageId } from './components/layout/Navbar'
import { DashboardPage } from './pages/DashboardPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerDossierPage } from './pages/CustomerDossierPage'
import { SyncPage } from './pages/SyncPage'
import { ConfigPage } from './pages/ConfigPage'
import { ToastContainer, type ToastMessage } from './components/ui/Toast'
import { api } from './api/client'

function getInitialRoute(): { page: PageId; customerId: string | null } {
  if (typeof window === 'undefined') return { page: 'resumen', customerId: null }
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash.startsWith('clientes/')) {
    return { page: 'clientes', customerId: hash.replace('clientes/', '') }
  }
  if (hash === 'clientes') return { page: 'clientes', customerId: null }
  if (hash === 'sincronizacion') return { page: 'sincronizacion', customerId: null }
  if (hash === 'configuracion') return { page: 'configuracion', customerId: null }
  return { page: 'resumen', customerId: null }
}

export const App: React.FC = () => {
  const initialRoute = getInitialRoute()
  const [currentPage, setCurrentPage] = useState<PageId>(initialRoute.page)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialRoute.customerId)
  const [companyName, setCompanyName] = useState('Cobrix Telecom')
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cobrix_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('cobrix_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }

  const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Sync with URL Hash for natural browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const route = getInitialRoute()
      setSelectedCustomerId(route.customerId)
      setCurrentPage(route.page)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleNavigate = (page: PageId) => {
    setSelectedCustomerId(null)
    setCurrentPage(page)
    window.location.hash = page === 'resumen' ? '' : page
  }

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id)
    window.location.hash = `clientes/${id}`
  }

  const handleBackToCustomers = () => {
    setSelectedCustomerId(null)
    window.location.hash = 'clientes'
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      companyName={companyName}
      isCollapsed={isSidebarCollapsed}
      onToggleCollapse={handleToggleSidebar}
    >
      {currentPage === 'resumen' && (
        <DashboardPage
          onNavigate={handleNavigate}
          onSelectCustomer={handleSelectCustomer}
          onProviderLoaded={(name) => setCompanyName(name)}
          notify={notify}
        />
      )}

      {currentPage === 'clientes' && !selectedCustomerId && (
        <CustomersPage
          onSelectCustomer={handleSelectCustomer}
          notify={notify}
        />
      )}

      {currentPage === 'clientes' && selectedCustomerId && (
        <CustomerDossierPage
          customerId={selectedCustomerId}
          onBack={handleBackToCustomers}
          notify={notify}
        />
      )}

      {currentPage === 'sincronizacion' && <SyncPage notify={notify} />}

      {currentPage === 'configuracion' && (
        <ConfigPage
          onConfigUpdated={(name) => setCompanyName(name)}
          notify={notify}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </Layout>
  )
}
