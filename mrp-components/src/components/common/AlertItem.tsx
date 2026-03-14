'use client'

import React from 'react'
import { AlertTriangle, AlertCircle, Info, type LucideIcon } from 'lucide-react'

type AlertSeverity = 'critical' | 'warning' | 'info'

interface AlertItemProps {
  severity: AlertSeverity
  title: string
  description: string
  timestamp?: string
  onClick?: () => void
}

const severityConfig: Record<AlertSeverity, { bg: string; icon: LucideIcon }> = {
  critical: { bg: 'bg-urgent-red-dim text-urgent-red', icon: AlertTriangle },
  warning: { bg: 'bg-alert-amber-dim text-alert-amber', icon: AlertCircle },
  info: { bg: 'bg-info-cyan-dim text-info-cyan', icon: Info },
}

export function AlertItem({
  severity,
  title,
  description,
  timestamp,
  onClick,
}: AlertItemProps) {
  const config = severityConfig[severity]
  const Icon = config.icon

  return (
    <div
      className={`
        flex gap-3 p-4 border-b border-mrp-border last:border-b-0
        ${onClick ? 'cursor-pointer hover:bg-slate/30' : ''}
      `}
      onClick={onClick}
    >
      <div
        className={`w-8 h-8 flex-shrink-0 flex items-center justify-center ${config.bg}`}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium text-mrp-text-primary mb-0.5 truncate">
          {title}
        </div>
        <div className="text-xs text-mrp-text-muted">
          {description}
          {timestamp && ` · ${timestamp}`}
        </div>
      </div>
    </div>
  )
}

export default AlertItem
