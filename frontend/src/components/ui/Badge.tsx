import React from 'react'

interface BadgeProps {
  variant?: 'open' | 'paid' | 'info' | 'neutral' | 'danger'
  children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children }) => {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
