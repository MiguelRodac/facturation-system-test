import React from 'react'
import { Check, AlertCircle, Info, Clock } from 'lucide-react'
import type { CustomerTimelineItem } from '../../api/types'

interface TimelineProps {
  items: CustomerTimelineItem[]
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 py-4">No hay eventos registrados en la línea de tiempo.</p>
  }

  return (
    <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6 py-2">
      {items.map((item, idx) => {
        const isOk = item.tone === 'ok'
        const isWarn = item.tone === 'warn'
        const isInfo = item.tone === 'info'

        const Icon = isOk ? Check : isWarn ? AlertCircle : isInfo ? Info : Clock

        const dotColors = isOk
          ? 'bg-emerald-50 text-emerald-600 border-emerald-500'
          : isWarn
          ? 'bg-amber-50 text-amber-600 border-amber-500'
          : isInfo
          ? 'bg-teal-50 text-teal-600 border-teal-500'
          : 'bg-slate-50 text-slate-500 border-slate-400'

        return (
          <div key={idx} className="relative group">
            <div
              className={`absolute -left-[35px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 shadow-xs z-10 transition-transform group-hover:scale-110 ${dotColors}`}
            >
              <Icon className="w-2.5 h-2.5 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0 bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-xs text-slate-900 truncate">
                  {item.title}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                  {item.date}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
