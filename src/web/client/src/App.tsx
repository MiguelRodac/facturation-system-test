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

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('resumen')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('Cobrix Telecom')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

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
      const hash = window.location.hash.replace(/^#\/?/, '')
      if (hash.startsWith('clientes/')) {
        const id = hash.replace('clientes/', '')
        setSelectedCustomerId(id)
        setCurrentPage('clientes')
      } else if (hash === 'clientes') {
        setSelectedCustomerId(null)
        setCurrentPage('clientes')
      } else if (hash === 'sincronizacion') {
        setSelectedCustomerId(null)
        setCurrentPage('sincronizacion')
      } else if (hash === 'configuracion') {
        setSelectedCustomerId(null)
        setCurrentPage('configuracion')
      } else {
        setSelectedCustomerId(null)
        setCurrentPage('resumen')
      }
    }

    handleHashChange()
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
