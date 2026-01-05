// =============================================================================
// 📱 MINIMALIST SIDEBAR
// Premium UI/UX - Clean and focused
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Home,
  Package,
  ShoppingCart,
  Factory,
  Calculator,
  ClipboardCheck,
  Activity,
  FileText,
  Settings,
  Plus,
  X,
  Sparkles,
  Smartphone,
  Wrench,
  LayoutDashboard,
  Layers,
  Users,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Building2,
  MoreHorizontal
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
// DEFAULT FAVORITES
// =============================================================================

const defaultFavorites: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelVi: 'Tổng quan', icon: <LayoutDashboard className="w-5 h-5" />, href: '/dashboard', color: 'text-blue-600' },
  { id: 'sales', label: 'Sales Orders', labelVi: 'Đơn hàng', icon: <ShoppingCart className="w-5 h-5" />, href: '/sales', color: 'text-violet-600', badge: 5 },
  { id: 'inventory', label: 'Inventory', labelVi: 'Tồn kho', icon: <Package className="w-5 h-5" />, href: '/inventory', color: 'text-emerald-600' },
  { id: 'production', label: 'Production', labelVi: 'Sản xuất', icon: <Factory className="w-5 h-5" />, href: '/production', color: 'text-orange-600' },
  { id: 'mrp', label: 'MRP Planning', labelVi: 'Hoạch định MRP', icon: <Calculator className="w-5 h-5" />, href: '/mrp-wizard', color: 'text-purple-600' },
];

const recentItems: SidebarItem[] = [
  { id: 'oee', label: 'OEE Dashboard', labelVi: 'OEE Dashboard', icon: <Activity className="w-5 h-5" />, href: '/oee', color: 'text-emerald-600' },
  { id: 'quality', label: 'Quality', labelVi: 'Chất lượng', icon: <ClipboardCheck className="w-5 h-5" />, href: '/quality', color: 'text-teal-600' },
  { id: 'alerts', label: 'Alerts', labelVi: 'Cảnh báo', icon: <AlertTriangle className="w-5 h-5" />, href: '/alerts', color: 'text-orange-600' },
];

const toolItems: SidebarItem[] = [
  { id: 'parts', label: 'Parts Master', labelVi: 'Danh mục vật tư', icon: <Package className="w-5 h-5" />, href: '/parts', color: 'text-gray-600' },
  { id: 'bom', label: 'BOM', labelVi: 'Định mức BOM', icon: <Layers className="w-5 h-5" />, href: '/bom', color: 'text-cyan-600' },
  { id: 'suppliers', label: 'Suppliers', labelVi: 'Nhà cung cấp', icon: <Building2 className="w-5 h-5" />, href: '/supplier', color: 'text-amber-600' },
  { id: 'customers', label: 'Customers', labelVi: 'Khách hàng', icon: <Users className="w-5 h-5" />, href: '/customer', color: 'text-blue-600' },
];

const mobileItems: SidebarItem[] = [
  { id: 'mobile', label: 'Mobile App', labelVi: 'Ứng dụng Mobile', icon: <Smartphone className="w-5 h-5" />, href: '/mobile', color: 'text-indigo-600' },
  { id: 'technician', label: 'Technician', labelVi: 'Kỹ thuật viên', icon: <Wrench className="w-5 h-5" />, href: '/mobile/technician', color: 'text-gray-600' },
];

// =============================================================================
// SIDEBAR SECTION
// =============================================================================

interface SidebarSectionProps {
  title: string;
  titleVi: string;
  items: SidebarItem[];
  collapsed: boolean;
  language: 'en' | 'vi';
  activePath: string;
  showAddButton?: boolean;
  onAdd?: () => void;
}

function SidebarSection({
  title,
  titleVi,
  items,
  collapsed,
  language,
  activePath,
  showAddButton,
  onAdd,
}: SidebarSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Section Header */}
      {!collapsed && (
        <div className="flex items-center justify-between px-3 mb-1">
          <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {language === 'vi' ? titleVi : title}
          </h3>
          {showAddButton && (
            <button
              onClick={onAdd}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <Plus className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Items */}
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = activePath === item.href || activePath.startsWith(item.href + '/');

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-lg transition-all relative',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
              title={collapsed ? (language === 'vi' ? item.labelVi : item.label) : undefined}
            >
              <span className={cn(
                'flex-shrink-0 transition-colors',
                isActive ? item.color : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'
              )}>
                {item.icon}
              </span>

              {!collapsed && (
                <>
                  <span className="flex-1 text-sm font-medium truncate">
                    {language === 'vi' ? item.labelVi : item.label}
                  </span>

                  {item.badge && (
                    <span className={cn(
                      'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                      typeof item.badge === 'number'
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
              )}
            </Link>
          );
        })}
      </div>
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
  user = { name: 'Admin User', email: 'admin@rtr.vn' },
}: MinimalistSidebarProps) {
  const pathname = usePathname();
  const [favorites, setFavorites] = useState(defaultFavorites);
  const [showMore, setShowMore] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-16 px-3 border-b border-gray-100 dark:border-gray-800',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="text-white font-bold text-xs">MRP</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">RTR</span>
          </div>
        )}

        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {/* Favorites */}
        <SidebarSection
          title="Favorites"
          titleVi="Yêu thích"
          items={favorites}
          collapsed={collapsed}
          language={language}
          activePath={pathname}
          showAddButton={!collapsed}
        />

        {/* Recent */}
        <SidebarSection
          title="Recent"
          titleVi="Gần đây"
          items={recentItems}
          collapsed={collapsed}
          language={language}
          activePath={pathname}
        />

        {/* Separator */}
        {!collapsed && (
          <div className="h-px bg-gray-100 dark:bg-gray-800 my-4 mx-3" />
        )}

        {/* Tools (Collapsed shows only icons) */}
        <SidebarSection
          title="Tools"
          titleVi="Công cụ"
          items={toolItems}
          collapsed={collapsed}
          language={language}
          activePath={pathname}
        />

        {/* Mobile Section */}
        <SidebarSection
          title="Mobile"
          titleVi="Di động"
          items={mobileItems}
          collapsed={collapsed}
          language={language}
          activePath={pathname}
        />
      </div>

      {/* Footer */}
      <div className={cn(
        'p-3 border-t border-gray-100 dark:border-gray-800',
        collapsed ? 'flex justify-center' : ''
      )}>
        {collapsed ? (
          <Link
            href="/settings"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
                {user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </div>
            </div>
            <Link
              href="/settings"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        )}
      </div>

      {/* AI Assistant Quick Access */}
      {!collapsed && (
        <div className="p-3 pt-0">
          <Link
            href="/ai-insights"
            className="flex items-center gap-2 p-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-100 dark:border-violet-800/30 hover:shadow-md transition-all"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-violet-700 dark:text-violet-300">
                AI Insights
              </div>
              <div className="text-xs text-violet-500 dark:text-violet-400">
                {language === 'vi' ? 'Phân tích thông minh' : 'Smart analysis'}
              </div>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}

export default MinimalistSidebar;
