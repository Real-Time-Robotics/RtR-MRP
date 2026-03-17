// =============================================================================
// INDUSTRIAL SIDEBAR - Phase 2B Rebuild
// Sharp edges, text labels always visible, Industrial Precision style
// =============================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
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
  PanelLeft,
  MessageSquare,
  Warehouse,
  PackageMinus,
  FileSpreadsheet,
  BarChart3,
  PackageX,
  Truck,
  ClipboardList,
  Clock,
  TrendingDown,
  Database
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

// COMPACT: w-4 h-4 → w-3.5 h-3.5 (16px → 14px)
const mainNavItems: SidebarItem[] = [
  { id: 'dashboard', label: 'DASHBOARD', labelVi: 'TỔNG QUAN', icon: <LayoutDashboard className="w-3.5 h-3.5" />, href: '/home' },
  { id: 'sales', label: 'ORDERS', labelVi: 'ĐƠN HÀNG', icon: <ShoppingCart className="w-3.5 h-3.5" />, href: '/orders' },
  { id: 'inventory', label: 'INVENTORY', labelVi: 'TỒN KHO', icon: <Package className="w-3.5 h-3.5" />, href: '/inventory' },
  { id: 'production', label: 'PRODUCTION', labelVi: 'SẢN XUẤT', icon: <Factory className="w-3.5 h-3.5" />, href: '/production' },
  { id: 'mrp', label: 'MRP', labelVi: 'MRP', icon: <Calculator className="w-3.5 h-3.5" />, href: '/mrp' },
  { id: 'quality', label: 'QUALITY', labelVi: 'CHẤT LƯỢNG', icon: <ClipboardCheck className="w-3.5 h-3.5" />, href: '/quality' },
];

const toolItems: SidebarItem[] = [
  { id: 'parts', label: 'PARTS', labelVi: 'VẬT TƯ', icon: <Package className="w-3.5 h-3.5" />, href: '/parts' },
  { id: 'bom', label: 'BOM', labelVi: 'BOM', icon: <Layers className="w-3.5 h-3.5" />, href: '/bom' },
  { id: 'suppliers', label: 'SUPPLIERS', labelVi: 'NCC', icon: <Building2 className="w-3.5 h-3.5" />, href: '/suppliers' },
  { id: 'warehouses', label: 'WAREHOUSES', labelVi: 'KHO', icon: <Warehouse className="w-3.5 h-3.5" />, href: '/warehouses' },
  { id: 'issue', label: 'ISSUE', labelVi: 'XUẤT KHO', icon: <PackageMinus className="w-3.5 h-3.5" />, href: '/inventory/issue' },
  { id: 'finance', label: 'FINANCE', labelVi: 'KẾ TOÁN', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, href: '/finance/misa-export' },
  { id: 'reports', label: 'REPORTS', labelVi: 'BÁO CÁO', icon: <BarChart3 className="w-3.5 h-3.5" />, href: '/reports' },
  { id: 'cost-optimization', label: 'COST OPT', labelVi: 'TỐI ƯU CP', icon: <TrendingDown className="w-3.5 h-3.5" />, href: '/cost-optimization' },
  { id: 'data-setup', label: 'DATA SETUP', labelVi: 'THIẾT LẬP DL', icon: <Database className="w-3.5 h-3.5" />, href: '/data-setup' },
];

const utilityItems: SidebarItem[] = [
  { id: 'backorders', label: 'BACKORDERS', labelVi: 'GIAO THIẾU', icon: <PackageX className="w-3.5 h-3.5" />, href: '/orders/backorders' },
  { id: 'subcontracting', label: 'SUBCONTRACT', labelVi: 'GIA CÔNG', icon: <Truck className="w-3.5 h-3.5" />, href: '/production/subcontracting' },
  { id: 'cycle-count', label: 'CYCLE COUNT', labelVi: 'KIỂM KÊ', icon: <ClipboardList className="w-3.5 h-3.5" />, href: '/inventory/cycle-count' },
  { id: 'expiry', label: 'EXPIRY', labelVi: 'HẾT HẠN', icon: <Clock className="w-3.5 h-3.5" />, href: '/inventory/expiry-alerts' },
  { id: 'discussions', label: 'DISCUSS', labelVi: 'THẢO LUẬN', icon: <MessageSquare className="w-3.5 h-3.5" />, href: '/discussions' },
  { id: 'mobile', label: 'MOBILE', labelVi: 'MOBILE', icon: <Smartphone className="w-3.5 h-3.5" />, href: '/mobile' },
  { id: 'alerts', label: 'ALERTS', labelVi: 'CẢNH BÁO', icon: <AlertTriangle className="w-3.5 h-3.5" />, href: '/alerts' },
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
        'group flex items-center transition-all relative',
        collapsed
          ? 'justify-center py-1.5'
          : 'gap-2 px-2.5 py-1.5 border-l-2',
        // Active state
        collapsed
          ? isActive
            ? 'bg-gray-100 dark:bg-gunmetal text-info-cyan'
            : 'text-gray-600 dark:text-mrp-text-secondary hover:bg-gray-50 dark:hover:bg-gunmetal hover:text-gray-900 dark:hover:text-mrp-text-primary'
          : isActive
            ? 'bg-gray-100 dark:bg-gunmetal border-l-info-cyan text-info-cyan'
            : 'border-l-transparent text-gray-600 dark:text-mrp-text-secondary hover:bg-gray-50 dark:hover:bg-gunmetal hover:text-gray-900 dark:hover:text-mrp-text-primary hover:border-l-gray-300 dark:hover:border-l-mrp-border'
      )}
      title={collapsed ? (language === 'vi' ? item.labelVi : item.label) : undefined}
    >
      {/* Icon */}
      <span className={cn(
        'flex-shrink-0 transition-colors',
        isActive ? 'text-info-cyan' : 'text-gray-600 dark:text-mrp-text-muted group-hover:text-info-cyan'
      )}>
        {item.icon}
      </span>

      {/* Label */}
      {!collapsed && (
        <>
          {/* COMPACT: text-xs → text-[11px] */}
          <span className={cn(
            'flex-1 text-[11px] font-semibold font-mono tracking-wider truncate',
            isActive ? 'text-gray-900 dark:text-mrp-text-primary' : 'text-gray-700 dark:text-mrp-text-secondary group-hover:text-gray-900 dark:group-hover:text-mrp-text-primary'
          )}>
            {language === 'vi' ? item.labelVi : item.label}
          </span>

          {/* Badge - COMPACT */}
          {item.badge && (
            <span className="px-1 py-0.5 text-[9px] font-bold font-mono bg-info-cyan/10 dark:bg-info-cyan-dim text-info-cyan">
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
    // COMPACT: px-3 py-2 → px-2.5 py-1
    <div className="px-2.5 py-1">
      <span className="text-[9px] font-semibold font-mono text-gray-400 dark:text-mrp-text-muted uppercase tracking-widest">
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
        // Prismy: sidebar width 220px expanded, 48px collapsed
        'flex flex-col h-full transition-all duration-200',
        'bg-white dark:bg-steel-dark border-r border-gray-200 dark:border-mrp-border',
        collapsed ? 'w-12' : 'w-[220px]'
      )}
    >
      {/* Header - Product Name & Toggle */}
      <div className={cn(
        "flex items-center h-12 px-3 border-b border-gray-200 dark:border-mrp-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Logo height={28} width={100} className="h-7 w-auto" />
        )}
        <button
          onClick={onToggle}
          className="p-1.5 transition-colors text-gray-500 dark:text-mrp-text-muted hover:text-info-cyan hover:bg-gray-100 dark:hover:bg-gunmetal"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation - COMPACT: py-2 → py-1.5 */}
      <div className="flex-1 overflow-y-auto py-1.5">
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

        {/* Separator - COMPACT: my-3 → my-2, mx-3 → mx-2.5 */}
        <div className="h-px bg-gray-200 dark:bg-mrp-border my-2 mx-2.5" />

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

        {/* Separator - COMPACT: my-3 → my-2, mx-3 → mx-2.5 */}
        <div className="h-px bg-gray-200 dark:bg-mrp-border my-2 mx-2.5" />

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

      {/* Footer - COMPACT */}
      <div className="border-t border-gray-200 dark:border-mrp-border p-1.5 space-y-0.5">
        {/* AI Insights */}
        <Link
          href="/ai/insights"
          className={cn(
            'flex items-center py-1.5 transition-all',
            'bg-info-cyan/10 dark:bg-info-cyan-dim border border-info-cyan/30',
            'hover:bg-info-cyan/20 hover:border-info-cyan/50',
            collapsed ? 'justify-center' : 'gap-2 px-2.5'
          )}
          title={collapsed ? 'AI Insights' : undefined}
        >
          <Sparkles className="w-3.5 h-3.5 text-info-cyan" />
          {!collapsed && (
            <span className="text-[11px] font-medium font-mono tracking-wider text-info-cyan">
              AI INSIGHTS
            </span>
          )}
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            'flex items-center py-1.5 transition-all',
            'text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-gray-900 dark:hover:text-mrp-text-primary',
            collapsed ? 'justify-center' : 'gap-2 px-2.5'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-3.5 h-3.5" />
          {!collapsed && (
            <span className="text-[11px] font-medium font-mono tracking-wider">
              {language === 'vi' ? 'CÀI ĐẶT' : 'SETTINGS'}
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default MinimalistSidebar;
