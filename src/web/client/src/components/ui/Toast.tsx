import React from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success'
        const isError = t.type === 'error'
        const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info

        return (
          <div
            key={t.id}
            onClick={() => onDismiss(t.id)}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 shadow-lg border transition-all cursor-pointer hover:opacity-95 ${
              isSuccess
                ? 'border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-100'
                : isError
                ? 'border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-100'
                : 'border-teal-200 dark:border-teal-800 text-slate-800 dark:text-slate-100'
            }`}
          >
            <Icon
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                isSuccess
                  ? 'text-emerald-500'
                  : isError
                  ? 'text-rose-500'
                  : 'text-teal-600'
              }`}
            />
            <div className="flex-1 text-xs font-medium leading-relaxed">{t.text}</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDismiss(t.id)
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
