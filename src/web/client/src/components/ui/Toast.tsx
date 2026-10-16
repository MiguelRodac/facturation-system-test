import React from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast"
          style={{
            borderLeft: `4px solid ${
              t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#3b82f6'
            }`,
          }}
          onClick={() => onDismiss(t.id)}
        >
          <span>
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
