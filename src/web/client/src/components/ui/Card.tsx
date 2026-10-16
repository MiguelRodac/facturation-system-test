import React from 'react'

interface CardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const Card: React.FC<CardProps> = ({ title, action, children, className = '', style }) => {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || action) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
