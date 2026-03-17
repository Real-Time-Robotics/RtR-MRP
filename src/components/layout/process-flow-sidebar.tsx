'use client';

// =============================================================================
// !!! SIDEBAR CHÍNH - CHỈ SỬ DỤNG FILE NÀY !!!
// Các file sidebar khác đã được đổi tên thành .deprecated
// - sidebar.tsx.deprecated (cũ)
// - sidebar-v2.tsx.deprecated (cũ)
// - layout-v2/sidebar.tsx.deprecated (cũ)
// =============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useSidebar } from '@/lib/sidebar-context';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  LayoutDashboard,
  Package,
  Layers,
  Building2,
  Warehouse,
  ShoppingCart,
  ClipboardList,
  Calculator,
  Truck,
  Factory,
  CheckCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Bell,
  Search,
  Zap,
  Upload,
  FileSpreadsheet,
  DollarSign,
  Activity,
  Smartphone,
  Brain,
  Wand2,
  Gauge,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// PROCESS-FLOW SIDEBAR
// Thiết kế theo Apple Design Principles
// Navigation phản ánh quy trình MRP tự nhiên
// =============================================================================

// Types
interface NavItem {
  id: string;
  labelKey: string; // Translation key
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

interface NavStage {
  id: string;
  labelKey: string; // Translation key
  color: string;
  bgColor: string;
  borderColor: string;
  items: NavItem[];
}

// =============================================================================
// NAVIGATION DATA - Theo Process Flow
// =============================================================================

const stages: NavStage[] = [
  {
    id: 'tools',
    labelKey: 'sidebar.tools',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-500',
    items: [
      { id: 'data-migration', labelKey: 'sidebar.dataMigration', icon: <Upload className="w-5 h-5" />, href: '/data-migration' },
      { id: 'excel', labelKey: 'sidebar.excelImport', icon: <FileSpreadsheet className="w-5 h-5" />, href: '/excel' },
    ],
  },
  {
    id: 'setup',
    labelKey: 'sidebar.setup',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-500',
    items: [
      { id: 'parts', labelKey: 'sidebar.parts', icon: <Package className="w-5 h-5" />, href: '/parts' },
      { id: 'bom', labelKey: 'sidebar.bom', icon: <Layers className="w-5 h-5" />, href: '/bom' },
      { id: 'suppliers', labelKey: 'sidebar.suppliers', icon: <Building2 className="w-5 h-5" />, href: '/suppliers' },
    ],
  },
  {
    id: 'operations',
    labelKey: 'sidebar.operations',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-500',
    items: [
      { id: 'sales', labelKey: 'sidebar.orders', icon: <ShoppingCart className="w-5 h-5" />, href: '/sales' },
      { id: 'inventory', labelKey: 'sidebar.inventory', icon: <ClipboardList className="w-5 h-5" />, href: '/inventory' },
      { id: 'mrp', labelKey: 'sidebar.mrp', icon: <Calculator className="w-5 h-5" />, href: '/mrp' },
      { id: 'mrp-wizard', labelKey: 'sidebar.mrpWizard', icon: <Wand2 className="w-5 h-5" />, href: '/mrp/wizard' },
    ],
  },
  {
    id: 'execution',
    labelKey: 'sidebar.execution',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-500',
    items: [
      { id: 'purchasing', labelKey: 'sidebar.purchasing', icon: <Truck className="w-5 h-5" />, href: '/purchasing' },
      { id: 'production', labelKey: 'sidebar.production', icon: <Factory className="w-5 h-5" />, href: '/production' },
      { id: 'oee', labelKey: 'sidebar.oee', icon: <Gauge className="w-5 h-5" />, href: '/production/oee' },
      { id: 'quality', labelKey: 'sidebar.quality', icon: <CheckCircle className="w-5 h-5" />, href: '/quality' },
      { id: 'finance', labelKey: 'sidebar.finance', icon: <DollarSign className="w-5 h-5" />, href: '/finance' },
    ],
  },
  {
    id: 'analysis',
    labelKey: 'sidebar.analysis',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-500',
    items: [
      { id: 'reports', labelKey: 'sidebar.reports', icon: <BarChart3 className="w-5 h-5" />, href: '/analytics' },
      { id: 'ai', labelKey: 'sidebar.ai', icon: <Brain className="w-5 h-5" />, href: '/ai' },
      { id: 'alerts', labelKey: 'sidebar.alerts', icon: <Bell className="w-5 h-5" />, href: '/alerts' },
      { id: 'activity', labelKey: 'sidebar.activity', icon: <Activity className="w-5 h-5" />, href: '/activity' },
    ],
  },
  {
    id: 'mobile',
    labelKey: 'sidebar.mobile',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-500',
    items: [
      { id: 'mobile-app', labelKey: 'sidebar.mobileApp', icon: <Smartphone className="w-5 h-5" />, href: '/mobile' },
      { id: 'technician', labelKey: 'sidebar.technician', icon: <Wrench className="w-5 h-5" />, href: '/mobile/technician' },
    ],
  },
];

// =============================================================================
// MENU ITEM COMPONENT
// =============================================================================

interface MenuItemProps {
  item: NavItem;
  stage: NavStage;
  isActive: boolean;
  isCollapsed: boolean;
  t: (key: string) => string;
}

function MenuItem({ item, stage, isActive, isCollapsed, t }: MenuItemProps) {
  const label = t(item.labelKey);
  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-2.5 px-3 py-1.5 rounded-lg',
        'transition-all duration-200 ease-out',
        isActive
          ? cn('bg-white dark:bg-[rgb(var(--bg-secondary))] shadow-sm', stage.color, 'border-l-3', stage.borderColor)
          : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[rgb(var(--bg-secondary))/0.6] hover:text-gray-900 dark:hover:text-white'
      )}
      title={isCollapsed ? label : undefined}
    >
      {/* Left border indicator for active */}
      {isActive && (
        <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full', stage.bgColor.replace('bg-', 'bg-').replace('/20', ''))} />
      )}

      {/* Icon */}
      <span className={cn(
        'flex-shrink-0 transition-colors',
        isActive ? stage.color : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
      )}>
        {item.icon}
      </span>

      {/* Label */}
      {!isCollapsed && (
        <span className="flex-1 font-medium text-sm truncate">
          {label}
        </span>
      )}

      {/* Badge */}
      {item.badge && !isCollapsed && (
        <span className={cn(
          'px-2 py-0.5 text-xs font-bold rounded-full',
          isActive
            ? 'bg-white dark:bg-[rgb(var(--bg-tertiary))] text-gray-900 dark:text-white'
            : 'bg-red-500 text-white'
        )}>
          {item.badge}
        </span>
      )}

      {/* Badge dot for collapsed */}
      {item.badge && isCollapsed && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}

      {/* Tooltip for collapsed */}
      {isCollapsed && (
        <div className={cn(
          'absolute left-full ml-3 px-3 py-2 rounded-lg shadow-lg',
          'bg-gray-900 dark:bg-[rgb(var(--bg-tertiary))] text-white text-sm font-medium',
          'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
          'transition-all duration-200 z-50 whitespace-nowrap'
        )}>
          {label}
          {item.badge && (
            <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded-full text-xs">
              {item.badge}
            </span>
          )}
          {/* Arrow */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-[rgb(var(--bg-tertiary))] rotate-45" />
        </div>
      )}
    </Link>
  );
}

// =============================================================================
// STAGE GROUP COMPONENT
// =============================================================================

interface StageGroupProps {
  stage: NavStage;
  isCollapsed: boolean;
  pathname: string;
  t: (key: string) => string;
}

function StageGroup({ stage, isCollapsed, pathname, t }: StageGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasActiveItem = stage.items.some((item) => pathname.startsWith(item.href));

  // Auto-expand if has active item
  useEffect(() => {
    if (hasActiveItem) {
      setIsExpanded(true);
    }
  }, [hasActiveItem]);

  if (isCollapsed) {
    return (
      <div className="space-y-0.5 py-1">
        {stage.items.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            stage={stage}
            isActive={pathname.startsWith(item.href)}
            isCollapsed={true}
            t={t}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* Stage header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-1.5',
          'text-[11px] font-semibold uppercase tracking-wider',
          'transition-colors duration-200',
          stage.color
        )}
      >
        <span>{t(stage.labelKey)}</span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 transition-transform duration-200',
          !isExpanded && '-rotate-90'
        )} />
      </button>

      {/* Stage items */}
      <div className={cn(
        'space-y-0.5 overflow-hidden transition-all duration-300',
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      )}>
        {stage.items.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            stage={stage}
            isActive={pathname.startsWith(item.href)}
            isCollapsed={false}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN SIDEBAR COMPONENT
// =============================================================================

interface ProcessFlowSidebarProps {
  className?: string;
}

export function ProcessFlowSidebar({ className }: ProcessFlowSidebarProps) {
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-xl shadow-lg border border-gray-200 dark:border-[rgb(var(--border-primary))] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen',
          'bg-gray-50 dark:bg-[rgb(var(--bg-primary))]',
          'border-r border-gray-200 dark:border-[rgb(var(--border-primary))]',
          'flex flex-col',
          'transition-all duration-300 ease-out',
          isCollapsed ? 'w-[72px]' : 'w-64',
          // Mobile
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-[rgb(var(--border-primary))]">
          <Link href="/home" className="flex items-center gap-3">
            {isCollapsed ? (
              <Logo height={32} width={32} className="h-8 w-8 object-contain" />
            ) : (
              <Logo height={32} width={120} className="h-8 w-auto" />
            )}
          </Link>

          <div className="flex items-center gap-1">
            {/* Collapse button - desktop only */}
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[rgb(var(--sidebar-item-hover))] transition-colors"
              title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            {/* Mobile close */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-[rgb(var(--sidebar-item-hover))] lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dashboard link - always visible */}
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/home"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg',
              'transition-all duration-200',
              pathname === '/home' || pathname === '/'
                ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200/50 dark:border-blue-800/50'
                : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            {!isCollapsed && (
              <span className="font-semibold text-sm">{t('sidebar.dashboard')}</span>
            )}
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-4 my-1 border-t border-gray-200 dark:border-[rgb(var(--border-primary))]" />

        {/* Navigation stages */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0">
          {stages.map((stage) => (
            <StageGroup
              key={stage.id}
              stage={stage}
              isCollapsed={isCollapsed}
              pathname={pathname}
              t={t}
            />
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-4 my-1 border-t border-gray-200 dark:border-[rgb(var(--border-primary))]" />

        {/* User & Settings - Combined section */}
        <div className={cn(
          'p-2',
          isCollapsed && 'flex flex-col items-center gap-1'
        )}>
          {isCollapsed ? (
            <>
              {/* Collapsed: Stack vertically - Settings on top, User at bottom */}
              <Link
                href="/settings"
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  pathname === '/settings'
                    ? 'text-blue-600 bg-white dark:bg-[rgb(var(--bg-secondary))] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                )}
                title={t('sidebar.settings')}
              >
                <Settings className="w-4 h-4" />
              </Link>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-sm cursor-pointer hover:scale-105 transition-transform" title="Admin User">
                AU
              </div>
            </>
          ) : (
            /* Expanded: Horizontal layout */
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[rgb(var(--bg-secondary))] shadow-sm">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                AU
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  Admin User
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  admin@rtr.vn
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-0.5">
                <Link
                  href="/settings"
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    pathname === '/settings'
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))]'
                  )}
                  title={t('sidebar.settings')}
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={t('sidebar.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// =============================================================================
// COMPACT PROCESS INDICATOR (for mobile/top bar)
// =============================================================================

export function ProcessIndicator() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Find current stage and item
  let currentStage: NavStage | null = null;
  let currentItem: NavItem | null = null;

  for (const stage of stages) {
    const item = stage.items.find((i) => pathname.startsWith(i.href));
    if (item) {
      currentStage = stage;
      currentItem = item;
      break;
    }
  }

  if (!currentStage || !currentItem) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
      currentStage.bgColor,
      currentStage.color
    )}>
      <span className="font-medium">{t(currentStage.labelKey)}</span>
      <ChevronRight className="w-4 h-4 opacity-50" />
      <span>{t(currentItem.labelKey)}</span>
    </div>
  );
}

export default ProcessFlowSidebar;
