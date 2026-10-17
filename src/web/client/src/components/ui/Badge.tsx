import React from 'react'

interface BadgeProps {
  variant?: 'open' | 'paid' | 'info' | 'neutral' | 'danger'
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  const variantStyles = {
    open: 'bg-amber-50 text-amber-700 border-amber-200/60',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
