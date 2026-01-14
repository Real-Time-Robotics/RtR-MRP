// =============================================================================
// INDUSTRIAL SIDEBAR - Phase 2B Rebuild
// Sharp edges, text labels always visible, Industrial Precision style
// =============================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  Factory,
  Calculator,
  ClipboardCheck,
  Settings,
  Sparkles,
  Smartphone,
  LayoutDashboard,
  Layers,
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
  badge?: string | number;
}

// =============================================================================
// NAVIGATION ITEMS
// =============================================================================

const mainNavItems: SidebarItem[] = [
  { id: 'dashboard', label: 'DASHBOARD', labelVi: 'TỔNG QUAN', icon: <LayoutDashboard className="w-4 h-4" />, href: '/home' },
  { id: 'sales', label: 'ORDERS', labelVi: 'ĐƠN HÀNG', icon: <ShoppingCart className="w-4 h-4" />, href: '/orders', badge: 5 },
  { id: 'inventory', label: 'INVENTORY', labelVi: 'TỒN KHO', icon: <Package className="w-4 h-4" />, href: '/inventory' },
  { id: 'production', label: 'PRODUCTION', labelVi: 'SẢN XUẤT', icon: <Factory className="w-4 h-4" />, href: '/production' },
  { id: 'mrp', label: 'MRP', labelVi: 'MRP', icon: <Calculator className="w-4 h-4" />, href: '/mrp' },
  { id: 'quality', label: 'QUALITY', labelVi: 'CHẤT LƯỢNG', icon: <ClipboardCheck className="w-4 h-4" />, href: '/quality' },
];

const toolItems: SidebarItem[] = [
  { id: 'parts', label: 'PARTS', labelVi: 'VẬT TƯ', icon: <Package className="w-4 h-4" />, href: '/parts' },
  { id: 'bom', label: 'BOM', labelVi: 'BOM', icon: <Layers className="w-4 h-4" />, href: '/bom' },
  { id: 'suppliers', label: 'SUPPLIERS', labelVi: 'NCC', icon: <Building2 className="w-4 h-4" />, href: '/suppliers' },
];

const utilityItems: SidebarItem[] = [
  { id: 'mobile', label: 'MOBILE', labelVi: 'MOBILE', icon: <Smartphone className="w-4 h-4" />, href: '/mobile' },
  { id: 'alerts', label: 'ALERTS', labelVi: 'CẢNH BÁO', icon: <AlertTriangle className="w-4 h-4" />, href: '/alerts' },
];

// =============================================================================
// SIDEBAR NAV ITEM - Industrial Precision Style
// =============================================================================

function NavItem({
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
        // Base styles - Industrial Precision: NO rounded corners
        'group flex items-center gap-3 px-3 py-2.5 transition-all relative',
        'border-l-2',
        collapsed ? 'justify-center' : '',
        // Active state
        isActive
          ? 'bg-gunmetal-light dark:bg-gunmetal border-l-info-cyan text-info-cyan'
          : 'border-l-transparent text-mrp-text-secondary hover:bg-gunmetal/50 dark:hover:bg-gunmetal hover:text-mrp-text-primary hover:border-l-mrp-border'
      )}
      title={collapsed ? (language === 'vi' ? item.labelVi : item.label) : undefined}
    >
      {/* Icon */}
      <span className={cn(
        'flex-shrink-0 transition-colors',
        isActive ? 'text-info-cyan' : 'text-mrp-text-muted group-hover:text-info-cyan'
      )}>
        {item.icon}
      </span>

      {/* Label - Always visible when not collapsed */}
      {!collapsed && (
        <>
          <span className={cn(
            'flex-1 text-xs font-medium font-mono tracking-wider truncate',
            isActive ? 'text-mrp-text-primary' : 'text-mrp-text-secondary group-hover:text-mrp-text-primary'
          )}>
            {language === 'vi' ? item.labelVi : item.label}
          </span>

          {/* Badge */}
          {item.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-info-cyan-dim text-info-cyan">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

// =============================================================================
// SECTION HEADER
// =============================================================================

function SectionHeader({
  label,
  collapsed
}: {
  label: string;
  collapsed: boolean;
}) {
  if (collapsed) return null;

  return (
    <div className="px-3 py-2">
      <span className="text-[10px] font-semibold font-mono text-mrp-text-muted uppercase tracking-widest">
        {label}
      </span>
    </div>
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

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/dashboard' || pathname.startsWith('/home/');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside
      className={cn(
        // Industrial Precision: Dark steel background, sharp edges, cyan border
        'flex flex-col h-full transition-all duration-200',
        'bg-steel-dark border-r border-mrp-border',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Header - Product Name & Toggle */}
      <div className={cn(
        "flex items-center h-12 px-3 border-b border-mrp-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {/* Product Name */}
        {!collapsed && (
          <div className="flex items-baseline gap-0.5">
            <span className="font-bold text-sm font-mono text-mrp-text-primary tracking-tight">
              RTR
            </span>
            <span className="text-info-cyan font-bold text-sm font-mono">-MRP</span>
            <span className="w-1.5 h-1.5 bg-production-green ml-1 animate-pulse" />
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={cn(
            "p-1.5 transition-colors",
            "text-mrp-text-muted hover:text-info-cyan hover:bg-gunmetal"
          )}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Main Navigation */}
        <SectionHeader label={language === 'vi' ? 'Điều hướng' : 'Navigation'} collapsed={collapsed} />
        <nav className="space-y-0.5">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              language={language}
              isActive={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Separator */}
        <div className="h-px bg-mrp-border my-3 mx-3" />

        {/* Tools */}
        <SectionHeader label={language === 'vi' ? 'Công cụ' : 'Tools'} collapsed={collapsed} />
        <nav className="space-y-0.5">
          {toolItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              language={language}
              isActive={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Separator */}
        <div className="h-px bg-mrp-border my-3 mx-3" />

        {/* Utilities */}
        <SectionHeader label={language === 'vi' ? 'Tiện ích' : 'Utilities'} collapsed={collapsed} />
        <nav className="space-y-0.5">
          {utilityItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              language={language}
              isActive={isActive(item.href)}
            />
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-mrp-border p-2 space-y-1">
        {/* AI Insights */}
        <Link
          href="/ai/insights"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 transition-all',
            'bg-info-cyan-dim border border-info-cyan/30',
            'hover:bg-info-cyan/20 hover:border-info-cyan/50',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'AI Insights' : undefined}
        >
          <Sparkles className="w-4 h-4 text-info-cyan" />
          {!collapsed && (
            <span className="text-xs font-medium font-mono tracking-wider text-info-cyan">
              AI INSIGHTS
            </span>
          )}
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 transition-all',
            'text-mrp-text-muted hover:bg-gunmetal hover:text-mrp-text-primary',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-4 h-4" />
          {!collapsed && (
            <span className="text-xs font-medium font-mono tracking-wider">
              {language === 'vi' ? 'CÀI ĐẶT' : 'SETTINGS'}
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default MinimalistSidebar;
