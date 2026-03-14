'use client'

import React from 'react'

type SystemStatus = 'online' | 'warning' | 'offline'

interface StatusBarProps {
  status?: SystemStatus
  statusText?: string
  lastUpdate?: string
  version?: string
}

const statusColors: Record<SystemStatus, string> = {
  online: 'bg-production-green',
  warning: 'bg-alert-amber',
  offline: 'bg-urgent-red',
}

export function StatusBar({
  status = 'online',
  statusText = 'He thong hoat dong binh thuong',
  lastUpdate,
  version = 'v1.0.0',
}: StatusBarProps) {
  return (
    <div className="h-statusbar bg-steel-dark border-t border-mrp-border flex items-center justify-between px-4 text-xs text-mrp-text-muted">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${statusColors[status]}`} />
        <span>{statusText}</span>
      </div>
      <div className="flex items-center gap-2">
        {lastUpdate && <span>Cap nhat: {lastUpdate}</span>}
        {lastUpdate && version && <span>·</span>}
        {version && <span>{version}</span>}
      </div>
    </div>
  )
}

export default StatusBar
