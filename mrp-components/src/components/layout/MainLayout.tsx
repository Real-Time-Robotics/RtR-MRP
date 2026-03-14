'use client'

import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'

interface MainLayoutProps {
  children: React.ReactNode
  activeNavId?: string
  onNavigate?: (id: string, href: string) => void
  userName?: string
  userInitials?: string
  notificationCount?: number
  showStatusBar?: boolean
  statusBarProps?: {
    status?: 'online' | 'warning' | 'offline'
    statusText?: string
    lastUpdate?: string
    version?: string
  }
}

export function MainLayout({
  children,
  activeNavId = 'dashboard',
  onNavigate,
  userName,
  userInitials,
  notificationCount,
  showStatusBar = true,
  statusBarProps,
}: MainLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="min-h-screen bg-steel-dark">
      <Header
        onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)}
        userName={userName}
        userInitials={userInitials}
        notificationCount={notificationCount}
      />

      <Sidebar
        activeId={activeNavId}
        expanded={sidebarExpanded}
        onNavigate={onNavigate}
      />

      <main className="ml-sidebar mt-header min-h-[calc(100vh-48px)] flex flex-col transition-[margin-left] duration-slow">
        {children}
        {showStatusBar && <StatusBar {...statusBarProps} />}
      </main>
    </div>
  )
}

export default MainLayout
