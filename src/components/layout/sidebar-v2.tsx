// =============================================================================
// SIDEBAR V2 — 9 cụm role-gated (Sprint 27 TIP-S27-06)
// Industrial Precision style, Vietnamese labels, English aria-labels
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
  // === TIP-S27-08: Hidden groups (shown when feature flag enabled) ===
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
      // Feature flag gate (if set, flag must be true)
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

function getDefaultExpanded(roles: RoleCode[]): string {
  if (roles.includes('production')) return 'operations';
  if (roles.includes('warehouse')) return 'warehouse';
  if (roles.includes('engineer')) return 'engineering';
  if (roles.includes('procurement')) return 'purchasing';
  return 'home';
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
  const defaultExpanded = getDefaultExpanded(user.roles);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set([defaultExpanded])
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
    // Match against both /dashboard/X and /X patterns
    if (pathname === fullHref || pathname === normalizedHref) return true;
    if (pathname.startsWith(fullHref + '/') || pathname.startsWith(normalizedHref + '/')) return true;
    // Also match /home → /dashboard or /dashboard/home
    if (href === '/home' && (pathname === '/dashboard' || pathname === '/home')) return true;
    return false;
  };

  return (
    <nav
      role="navigation"
      aria-label="Sidebar"
      className="flex flex-col h-full w-[220px] bg-white dark:bg-steel-dark border-r border-gray-200 dark:border-mrp-border overflow-y-auto"
    >
      <div className="py-2 space-y-0.5">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const Icon = group.icon;
          const hasActiveChild = group.items.some((item) => isActive(item.href));

          return (
            <div key={group.id}>
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
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gunmetal',
                  hasActiveChild
                    ? 'text-info-cyan'
                    : 'text-gray-700 dark:text-mrp-text-secondary'
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 text-[11px] font-semibold font-mono tracking-wider uppercase truncate">
                  {group.label}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-5 border-l border-gray-200 dark:border-mrp-border">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'block pl-3 pr-2 py-1 text-[11px] font-mono transition-colors',
                          active
                            ? 'text-info-cyan bg-info-cyan/5 border-l-2 border-info-cyan -ml-px'
                            : 'text-gray-600 dark:text-mrp-text-muted hover:text-gray-900 dark:hover:text-mrp-text-primary hover:bg-gray-50 dark:hover:bg-gunmetal'
                        )}
                      >
                        {item.label}
                        {item.badge && (
                          <span className="ml-1 px-1 py-0.5 text-[9px] font-bold bg-info-cyan/10 text-info-cyan rounded">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
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
