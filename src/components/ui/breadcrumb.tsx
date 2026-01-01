'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// BREADCRUMB NAVIGATION
// Auto-generates breadcrumbs from pathname
// =============================================================================

// Route label mappings
const routeLabels: Record<string, string> = {
  dashboard: 'Tổng quan',
  parts: 'Danh mục vật tư',
  bom: 'Định mức BOM',
  suppliers: 'Nhà cung cấp',
  inventory: 'Tồn kho',
  sales: 'Đơn hàng',
  purchasing: 'Mua hàng',
  mrp: 'Hoạch định MRP',
  production: 'Sản xuất',
  quality: 'Chất lượng',
  analytics: 'Báo cáo',
  settings: 'Cài đặt',
  'ai-insights': 'Trợ lý AI',
  new: 'Tạo mới',
  edit: 'Chỉnh sửa',
  wizard: 'Wizard',
};

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const label = routeLabels[path] || path.charAt(0).toUpperCase() + path.slice(1);
    breadcrumbs.push({
      label,
      href: currentPath,
      isCurrent: index === paths.length - 1,
    });
  });

  return breadcrumbs;
}

// =============================================================================
// BREADCRUMB COMPONENT
// =============================================================================

interface BreadcrumbProps {
  className?: string;
  showHome?: boolean;
  maxItems?: number;
}

export function Breadcrumb({ className, showHome = true, maxItems = 4 }: BreadcrumbProps) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Don't show on dashboard
  if (pathname === '/dashboard' || pathname === '/') {
    return null;
  }

  // Truncate if too many items
  let displayBreadcrumbs = breadcrumbs;
  let showEllipsis = false;
  if (breadcrumbs.length > maxItems) {
    displayBreadcrumbs = [
      breadcrumbs[0],
      ...breadcrumbs.slice(-maxItems + 1),
    ];
    showEllipsis = true;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-1.5 text-sm">
        {/* Home */}
        {showHome && (
          <>
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="sr-only">Trang chủ</span>
              </Link>
            </li>
            <li>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </li>
          </>
        )}

        {/* Ellipsis */}
        {showEllipsis && (
          <>
            <li>
              <span className="text-gray-400">...</span>
            </li>
            <li>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </li>
          </>
        )}

        {/* Breadcrumb items */}
        {displayBreadcrumbs.map((item, index) => (
          <React.Fragment key={item.href}>
            <li>
              {item.isCurrent ? (
                <span className="font-medium text-gray-900 dark:text-white" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
            {!item.isCurrent && (
              <li>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

// =============================================================================
// PAGE HEADER WITH BREADCRUMB
// =============================================================================

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <Breadcrumb />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {description && (
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export default Breadcrumb;
