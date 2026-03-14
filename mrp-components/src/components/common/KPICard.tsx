'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type DeltaType = 'positive' | 'negative' | 'neutral'

interface KPICardProps {
  label: string
  value: string | number
  delta?: {
    value: string
    type: DeltaType
  }
  className?: string
}

const deltaStyles: Record<DeltaType, { color: string; Icon: typeof TrendingUp }> = {
  positive: { color: 'text-production-green', Icon: TrendingUp },
  negative: { color: 'text-urgent-red', Icon: TrendingDown },
  neutral: { color: 'text-mrp-text-muted', Icon: Minus },
}

export function KPICard({ label, value, delta, className = '' }: KPICardProps) {
  const DeltaIcon = delta ? deltaStyles[delta.type].Icon : null

  return (
    <div className={`bg-gunmetal border border-mrp-border p-4 ${className}`}>
      <div className="text-xs font-medium uppercase tracking-wider text-mrp-text-muted mb-2">
        {label}
      </div>
      <div className="font-mono text-3xl font-semibold text-mrp-text-primary leading-tight">
        {value}
      </div>
      {delta && (
        <div
          className={`flex items-center gap-1 text-xs mt-2 ${deltaStyles[delta.type].color}`}
        >
          {DeltaIcon && <DeltaIcon size={12} />}
          <span>{delta.value}</span>
        </div>
      )}
    </div>
  )
}

export default KPICard
