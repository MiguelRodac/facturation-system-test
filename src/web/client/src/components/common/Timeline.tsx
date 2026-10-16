import React from 'react'
import type { CustomerTimelineItem } from '../../api/types'

interface TimelineProps {
  items: CustomerTimelineItem[]
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  if (items.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No hay eventos en la línea de tiempo.</p>
  }

  return (
    <div className="timeline">
      {items.map((item, idx) => {
        const isPaid = item.type.includes('PAYMENT') || item.type.includes('PAID')
        return (
          <div key={idx} className="timeline-item">
            <div className={`timeline-dot ${isPaid ? 'paid' : ''}`}>
              {isPaid ? '✓' : '•'}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-title">{item.title}</span>
                <span className="timeline-date mono">{item.date}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {item.description}
              </p>
              {item.amount !== undefined && (
                <div style={{ marginTop: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                  Monto: <span className="mono">${item.amount.toFixed(2)} USD</span>
                  {item.receipt_number && (
                    <span style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>
                      Recibo: <span className="mono">{item.receipt_number}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
