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
        const isOk = item.tone === 'ok'
        const isWarn = item.tone === 'warn'
        const isInfo = item.tone === 'info'
        return (
          <div key={idx} className="timeline-item">
            <div className={`timeline-dot ${isOk ? 'paid' : isWarn ? 'warn' : isInfo ? 'info' : ''}`}>
              {isOk ? '✓' : isWarn ? '!' : '•'}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-title">{item.title}</span>
                <span className="timeline-date mono">{item.date}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {item.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
