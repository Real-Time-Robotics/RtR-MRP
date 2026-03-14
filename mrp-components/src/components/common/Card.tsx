'use client'

import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

interface CardHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

interface CardBodyProps {
  children: React.ReactNode
  noPadding?: boolean
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-[rgba(45,49,57,0.5)] border border-mrp-border flex flex-col ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, action, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`px-4 py-3 border-b border-mrp-border flex items-center justify-between ${className}`}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-mrp-text-secondary">
        {title}
      </h3>
      {action}
    </div>
  )
}

export function CardBody({ children, noPadding = false, className = '' }: CardBodyProps) {
  return (
    <div className={`flex-1 overflow-auto ${noPadding ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Body = CardBody

export default Card
