import React from 'react'

interface CardProps {
  title?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const Card: React.FC<CardProps> = ({ title, action, children, className = '', style }) => {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden ${className}`}
      style={style}
    >
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          {typeof title === 'string' ? (
            <h3 className="font-semibold text-slate-800 text-sm tracking-tight">{title}</h3>
          ) : (
            title
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
