// =============================================================================
// SIDEBAR V2 — Enterprise Navigation
// Refined industrial aesthetic · Role-gated · Vietnamese labels
// =============================================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CheckSquare,
  Play,
  Search,
  Wrench,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Brain,
  Building,
  Smartphone,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoleCode } from '@/lib/auth/rbac';
import { FEATURE_FLAGS, type FeatureFlagKey } from '@/lib/feature-flags';

// =============================================================================
// TYPES
// =============================================================================

interface SidebarItem {
  href: string;
  label: string;
  badge?: string;
  roles?: RoleCode[];
}

interface SidebarGroup {
  id: string;
  label: string;
  ariaLabel: string;
  icon: LucideIcon;
  roles: RoleCode[] | 'all';
  featureFlag?: FeatureFlagKey;
  items: SidebarItem[];
}

// =============================================================================
// SIDEBAR GROUP CONFIG — 9 cụm
// =============================================================================

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'home',
    label: 'Trang chủ',
    ariaLabel: 'Home',
    icon: Home,
    roles: 'all',
    items: [
      { href: '/home', label: 'Bảng tin' },
      { href: '/notifications', label: 'Thông báo' },
    ],
  },
  {
    id: 'my-work',
    label: 'Công việc của tôi',
    ariaLabel: 'My Work',
    icon: CheckSquare,
    roles: 'all',
    items: [
      { href: '/my-work', label: 'Việc đang chờ tôi' },
      { href: '/my-work/created', label: 'Lệnh tôi tạo' },
      { href: '/my-work/approvals', label: 'Approval' },
    ],
  },
  {
    id: 'operations',
    label: 'Vận hành',
    ariaLabel: 'Operations',
    icon: Play,
    roles: 'all',
    items: [
      { href: '/operations/work-order', label: 'Gia công' },
      { href: '/operations/assembly', label: 'Lắp ráp' },
      { href: '/operations/issue', label: 'Xuất hàng' },
      { href: '/warehouse-receipts', label: 'Nhận hàng' },
      { href: '/inventory/cycle-count', label: 'Kiểm kho' },
    ],
  },
  {
    id: 'search',
    label: 'Tra cứu',
    ariaLabel: 'Search',
    icon: Search,
    roles: 'all',
    items: [
      { href: '/search/serial', label: 'Serial' },
      { href: '/parts', label: 'Part' },
      { href: '/bom', label: 'BOM' },
      { href: '/search/lot-history', label: 'Lịch sử lô' },
    ],
  },
  {
    id: 'engineering',
    label: 'Kỹ thuật & R&D',
    ariaLabel: 'Engineering & R&D',
    icon: Wrench,
    roles: ['engineer', 'admin'],
    items: [
      { href: '/engineering/module-design', label: 'Module Design' },
      { href: '/engineering/bom', label: 'BOM Templates' },
      { href: '/engineering/numbering', label: 'Numbering Rules' },
      { href: '/parts', label: 'Parts Master' },
    ],
  },
  {
    id: 'purchasing',
    label: 'Mua hàng',
    ariaLabel: 'Purchasing',
    icon: ShoppingCart,
    roles: ['procurement', 'admin'],
    items: [
      { href: '/purchase-orders', label: 'Đơn mua' },
      { href: '/purchase-requests', label: 'Yêu cầu mua' },
      { href: '/suppliers', label: 'Nhà cung cấp' },
      { href: '/grn', label: 'GRN' },
    ],
  },
  {
    id: 'warehouse',
    label: 'Kho',
    ariaLabel: 'Warehouse',
    icon: Package,
    roles: ['warehouse', 'admin'],
    items: [
      { href: '/inventory', label: 'Tồn kho' },
      { href: '/warehouse/locations', label: 'Vị trí' },
      { href: '/warehouse-receipts', label: 'Nhập kho' },
      { href: '/warehouse-issues', label: 'Xuất kho' },
      { href: '/inventory/cycle-count', label: 'Cycle count' },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    ariaLabel: 'Reports',
    icon: BarChart3,
    roles: 'all',
    items: [
      { href: '/reports/low-stock', label: 'Tồn kho thấp' },
      { href: '/reports/production', label: 'Sản lượng' },
      { href: '/reports/serial', label: 'Serial throughput' },
      { href: '/reports', label: 'Tổng quan KPI' },
    ],
  },
  {
    id: 'admin',
    label: 'Quản trị',
    ariaLabel: 'Administration',
    icon: Settings,
    roles: ['admin'],
    items: [
      { href: '/admin/users', label: 'Người dùng' },
      { href: '/admin/roles', label: 'Roles' },
      { href: '/admin/feature-flags', label: 'Feature Flags' },
      { href: '/admin/audit', label: 'Audit Log' },
    ],
  },
  // === Hidden groups (shown when feature flag enabled) ===
  {
    id: 'finance',
    label: 'Tài chính',
    ariaLabel: 'Finance',
    icon: DollarSign,
    roles: ['admin'],
    featureFlag: 'SHOW_FINANCE',
    items: [
      { href: '/finance/invoicing', label: 'Hoá đơn' },
      { href: '/finance/misa-export', label: 'Xuất MISA' },
      { href: '/finance/costing', label: 'Chi phí' },
    ],
  },
  {
    id: 'ai-ml',
    label: 'AI / ML',
    ariaLabel: 'AI and ML',
    icon: Brain,
    roles: ['admin'],
    featureFlag: 'SHOW_AI_ML',
    items: [
      { href: '/ai/forecast', label: 'Forecast' },
      { href: '/ai/insights', label: 'AI Insights' },
      { href: '/ai/quality', label: 'Quality AI' },
    ],
  },
  {
    id: 'multitenant',
    label: 'Multi-tenant',
    ariaLabel: 'Multi-tenant',
    icon: Building,
    roles: ['admin'],
    featureFlag: 'SHOW_MULTITENANT',
    items: [
      { href: '/settings', label: 'Tenant Settings' },
    ],
  },
  {
    id: 'mobile',
    label: 'Mobile',
    ariaLabel: 'Mobile',
    icon: Smartphone,
    roles: ['admin'],
    featureFlag: 'SHOW_MOBILE',
    items: [
      { href: '/mobile', label: 'Mobile Dashboard' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    ariaLabel: 'Compliance',
    icon: Shield,
    roles: ['admin'],
    featureFlag: 'SHOW_COMPLIANCE',
    items: [
      { href: '/compliance', label: 'Compliance Overview' },
    ],
  },
];

// =============================================================================
// FILTER LOGIC
// =============================================================================

function filterGroups(groups: SidebarGroup[], userRoles: RoleCode[]): SidebarGroup[] {
  return groups
    .filter((g) => {
      if (g.featureFlag && !FEATURE_FLAGS[g.featureFlag]) return false;
      if (g.roles === 'all') return true;
      if (userRoles.includes('admin')) return true;
      return userRoles.some((r) => (g.roles as RoleCode[]).includes(r));
    })
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (!item.roles) return true;
        if (userRoles.includes('admin')) return true;
        return userRoles.some((r) => item.roles!.includes(r));
      }),
    }));
}

// =============================================================================
// DEFAULT EXPANDED GROUP per role
// =============================================================================

function getDefaultExpanded(roles: RoleCode[]): string[] {
  const defaults = ['home'];
  if (roles.includes('production')) defaults.push('operations');
  else if (roles.includes('warehouse')) defaults.push('warehouse');
  else if (roles.includes('engineer')) defaults.push('engineering');
  else if (roles.includes('procurement')) defaults.push('purchasing');
  else defaults.push('operations');
  return defaults;
}

// =============================================================================
// SIDEBAR V2 COMPONENT
// =============================================================================

export interface SidebarV2Props {
  user: { id: string; roles: RoleCode[] };
}

export function SidebarV2({ user }: SidebarV2Props) {
  const pathname = usePathname();
  const filteredGroups = filterGroups(SIDEBAR_GROUPS, user.roles);
  const defaults = getDefaultExpanded(user.roles);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(defaults)
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const isActive = (href: string): boolean => {
    const fullHref = href.startsWith('/dashboard') ? href : `/dashboard${href.startsWith('/') ? href : `/${href}`}`;
    const normalizedHref = href.startsWith('/') ? href : `/${href}`;
    if (pathname === fullHref || pathname === normalizedHref) return true;
    if (pathname.startsWith(fullHref + '/') || pathname.startsWith(normalizedHref + '/')) return true;
    if (href === '/home' && (pathname === '/dashboard' || pathname === '/home')) return true;
    return false;
  };

  return (
    <nav
      role="navigation"
      aria-label="Sidebar"
      className={cn(
        'flex flex-col h-full w-[260px] overflow-y-auto',
        'bg-slate-50 dark:bg-[#0c0d0f]',
        'border-r border-slate-200/80 dark:border-slate-800/60',
      )}
    >
      {/* Scrollable content */}
      <div className="flex-1 py-3">
        {filteredGroups.map((group, groupIndex) => {
          const isExpanded = expandedGroups.has(group.id);
          const Icon = group.icon;
          const hasActiveChild = group.items.some((item) => isActive(item.href));

          return (
            <div key={group.id}>
              {/* Separator between groups */}
              {groupIndex > 0 && (
                <div className="mx-4 my-1.5 border-t border-slate-200/60 dark:border-slate-800/40" />
              )}

              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleGroup(group.id);
                  }
                }}
                aria-expanded={isExpanded}
                aria-label={group.ariaLabel}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                  'transition-colors duration-150',
                  'hover:bg-slate-100 dark:hover:bg-slate-800/50',
                  'rounded-lg mx-1.5',
                  'group',
                  hasActiveChild
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300'
                )}
                style={{ width: 'calc(100% - 12px)' }}
              >
                <Icon
                  className={cn(
                    'flex-shrink-0 transition-colors duration-150',
                    hasActiveChild
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                  )}
                  size={18}
                  strokeWidth={1.8}
                />
                <span className="flex-1 text-[13px] font-semibold tracking-tight truncate">
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    'flex-shrink-0 text-slate-400 dark:text-slate-600 transition-transform duration-200',
                    !isExpanded && '-rotate-90'
                  )}
                  size={15}
                  strokeWidth={2}
                />
              </button>

              {/* Group items */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <div className="ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-800 mr-3 mt-0.5 mb-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-[7px] rounded-md text-[13px] transition-all duration-150',
                          active
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 font-medium border-l-2 border-blue-500 -ml-[2px] pl-[10px]'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                        )}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// Export for testing
export { SIDEBAR_GROUPS, filterGroups };

export default SidebarV2;
