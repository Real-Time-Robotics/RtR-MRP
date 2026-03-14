'use client'

import React, { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  FileText,
  Ticket,
  Box,
  LineChart,
  Shield,
  Settings,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  href: string
  badge?: number
}

interface NavGroup {
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { id: 'parts', label: 'Linh kien', icon: Package, href: '/parts' },
      { id: 'bom', label: 'BOM', icon: FileText, href: '/bom' },
      { id: 'work-orders', label: 'Lenh san xuat', icon: Ticket, href: '/work-orders' },
      { id: 'inventory', label: 'Ton kho', icon: Box, href: '/inventory' },
    ],
  },
  {
    items: [
      { id: 'mrp', label: 'MRP', icon: LineChart, href: '/mrp' },
      { id: 'quality', label: 'Chat luong', icon: Shield, href: '/quality' },
    ],
  },
  {
    items: [
      { id: 'settings', label: 'Cai dat', icon: Settings, href: '/settings' },
    ],
  },
]

interface SidebarProps {
  activeId?: string
  expanded?: boolean
  onNavigate?: (id: string, href: string) => void
}

export function Sidebar({
  activeId = 'dashboard',
  expanded: controlledExpanded,
  onNavigate,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const expanded = controlledExpanded ?? isHovered

  return (
    <aside
      className={`fixed top-header left-0 bottom-0 bg-gunmetal border-r border-mrp-border z-[90] transition-[width] duration-slow overflow-hidden ${
        expanded ? 'w-sidebar-expanded' : 'w-sidebar'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <nav className="flex flex-col p-2">
        {navGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {groupIndex > 0 && (
              <div className="h-px bg-mrp-border mx-3 my-2" />
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = activeId === item.id

              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    if (onNavigate) {
                      e.preventDefault()
                      onNavigate(item.id, item.href)
                    }
                  }}
                  className={`flex items-center gap-3 py-2 px-3 text-mrp-text-secondary no-underline transition-all duration-fast whitespace-nowrap ${
                    isActive
                      ? 'bg-info-cyan-dim text-info-cyan border-l-2 border-l-info-cyan -ml-2 pl-[18px]'
                      : 'hover:bg-slate hover:text-mrp-text-primary'
                  }`}
                >
                  <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <Icon size={18} />
                  </span>
                  <span
                    className={`text-sm transition-opacity duration-base ${
                      expanded ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge && expanded && (
                    <span className="ml-auto bg-urgent-red text-white text-xs px-1.5 py-0.5 font-medium">
                      {item.badge}
                    </span>
                  )}
                </a>
              )
            })}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
