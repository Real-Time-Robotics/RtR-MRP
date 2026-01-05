// =============================================================================
// 📱 MINIMALIST SIDEBAR - Redesigned
// No duplicate headers - clean focused navigation
// =============================================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingCart,
  Factory,
  Calculator,
  ClipboardCheck,
  Activity,
  Settings,
  Plus,
  Sparkles,
  Smartphone,
  Wrench,
  LayoutDashboard,
  Layers,
  Users,
  AlertTriangle,
  Building2,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface SidebarItem {
  id: string;
  label: string;
  labelVi: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string | number;
}

// =============================================================================
// NAVIGATION ITEMS - Simplified
// =============================================================================

const quickNavItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelVi: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" />, href: '/dashboard', color: 'text-blue-500' },
  { id: 'sales', label: 'Orders', labelVi: 'Đơn hàng', icon: <ShoppingCart className="w-4 h-4" />, href: '/orders', color: 'text-violet-500', badge: 5 },
  { id: 'inventory', label: 'Inventory', labelVi: 'Tồn kho', icon: <Package className="w-4 h-4" />, href: '/inventory', color: 'text-emerald-500' },
  { id: 'production', label: 'Production', labelVi: 'Sản xuất', icon: <Factory className="w-4 h-4" />, href: '/production', color: 'text-orange-500' },
  { id: 'mrp', label: 'MRP', labelVi: 'MRP', icon: <Calculator className="w-4 h-4" />, href: '/mrp', color: 'text-purple-500' },
  { id: 'quality', label: 'Quality', labelVi: 'Chất lượng', icon: <ClipboardCheck className="w-4 h-4" />, href: '/quality', color: 'text-teal-500' },
];

const toolItems: SidebarItem[] = [
  { id: 'parts', label: 'Parts', labelVi: 'Vật tư', icon: <Package className="w-4 h-4" />, href: '/parts', color: 'text-gray-500' },
  { id: 'bom', label: 'BOM', labelVi: 'BOM', icon: <Layers className="w-4 h-4" />, href: '/bom', color: 'text-cyan-500' },
  { id: 'suppliers', label: 'Suppliers', labelVi: 'NCC', icon: <Building2 className="w-4 h-4" />, href: '/suppliers', color: 'text-amber-500' },
];

// =============================================================================
// SIDEBAR ITEM COMPONENT
// =============================================================================

function SidebarItem({
  item,
  collapsed,
  language,
  isActive,
}: {
  item: SidebarItem;
  collapsed: boolean;
  language: 'en' | 'vi';
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all relative',
        collapsed ? 'justify-center' : '',
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
      title={collapsed ? (language === 'vi' ? item.labelVi : item.label) : undefined}
    >
      <span className={cn(
        'flex-shrink-0',
        isActive ? item.color : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
      )}>
        {item.icon}
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 text-[13px] font-medium truncate">
            {language === 'vi' ? item.labelVi : item.label}
          </span>

          {item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

// =============================================================================
// MAIN SIDEBAR COMPONENT
// =============================================================================

export interface MinimalistSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  language?: 'en' | 'vi';
  user?: { name: string; email: string };
}

export function MinimalistSidebar({
  collapsed = false,
  onToggle,
  language = 'vi',
  user = { name: 'Admin', email: 'admin@rtr.vn' },
}: MinimalistSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200',
        collapsed ? 'w-14' : 'w-52'
      )}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-end p-2 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4 text-gray-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Quick Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {quickNavItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              language={language}
              isActive={isActive(item.href)}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="h-px bg-gray-100 dark:bg-gray-800 my-3" />

        {/* Tools */}
        {!collapsed && (
          <div className="px-2.5 mb-1.5">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {language === 'vi' ? 'Công cụ' : 'Tools'}
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          {toolItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              language={language}
              isActive={isActive(item.href)}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="h-px bg-gray-100 dark:bg-gray-800 my-3" />

        {/* Mobile & Technician */}
        <div className="space-y-0.5">
          <SidebarItem
            item={{ id: 'mobile', label: 'Mobile', labelVi: 'Mobile', icon: <Smartphone className="w-4 h-4" />, href: '/mobile', color: 'text-indigo-500' }}
            collapsed={collapsed}
            language={language}
            isActive={isActive('/mobile')}
          />
          <SidebarItem
            item={{ id: 'alerts', label: 'Alerts', labelVi: 'Cảnh báo', icon: <AlertTriangle className="w-4 h-4" />, href: '/alerts', color: 'text-orange-500' }}
            collapsed={collapsed}
            language={language}
            isActive={isActive('/alerts')}
          />
        </div>
      </div>

      {/* Footer - AI & Settings */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
        {/* AI Insights */}
        <Link
          href="/ai/insights"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all',
            'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
            'hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'AI Insights' : undefined}
        >
          <Sparkles className="w-4 h-4 text-violet-500" />
          {!collapsed && (
            <span className="text-[13px] font-medium text-violet-600 dark:text-violet-400">
              AI Insights
            </span>
          )}
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all',
            'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-4 h-4" />
          {!collapsed && (
            <span className="text-[13px] font-medium">
              {language === 'vi' ? 'Cài đặt' : 'Settings'}
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default MinimalistSidebar;
