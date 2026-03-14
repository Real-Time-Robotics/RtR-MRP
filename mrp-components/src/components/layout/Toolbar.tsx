'use client'

import React from 'react'

interface ToolbarProps {
  title: string
  children?: React.ReactNode
}

export function Toolbar({ title, children }: ToolbarProps) {
  return (
    <div className="h-toolbar bg-gunmetal border-b border-mrp-border flex items-center justify-between px-4 sticky top-header z-50">
      <h1 className="font-display text-md font-semibold uppercase tracking-wide text-mrp-text-primary">
        {title}
      </h1>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default Toolbar
