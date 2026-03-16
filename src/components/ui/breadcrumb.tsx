'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

// =============================================================================
// BREADCRUMB NAVIGATION
// Auto-generates breadcrumbs from pathname
// =============================================================================

// Route label translation keys
const routeLabelKeys: Record<string, string> = {
  dashboard: 'nav.dashboard',
  parts: 'nav.parts',
  bom: 'nav.bom',
  suppliers: 'nav.suppliers',
  inventory: 'nav.inventory',
  sales: 'nav.sales',
  purchasing: 'nav.purchasing',
  mrp: 'nav.mrp',
  production: 'nav.production',
  quality: 'nav.quality',
  analytics: 'nav.analytics',
  settings: 'nav.settings',
  'ai-insights': 'nav.aiInsights',
  new: 'common.createNew',
  edit: 'common.edit',
  wizard: 'common.wizard',
  customers: 'nav.customers',
  orders: 'nav.orders',
  warehouses: 'nav.warehouses',
  finance: 'nav.finance',
  costing: 'nav.costing',
  invoicing: 'nav.invoicing',
  reports: 'nav.reports',
  ai: 'nav.ai',
  compliance: 'nav.compliance',
  notifications: 'nav.notifications',
  alerts: 'nav.alerts',
  audit: 'nav.audit',
  profile: 'nav.profile',
  home: 'nav.home',
  'in-process': 'nav.inProcess',
  final: 'nav.final',
  ncr: 'nav.ncr',
  capa: 'nav.capa',
  hold: 'nav.hold',
  scrap: 'nav.scrap',
  traceability: 'nav.traceability',
  spc: 'nav.spc',
  schedule: 'nav.schedule',
  shortages: 'nav.shortages',
  'firm-orders': 'nav.firmOrders',
  'lead-time': 'nav.leadTime',
  'cost-optimization': 'nav.costOptimization',
  'make-vs-buy': 'nav.costOptimization.makeVsBuy',
  'bom-cost': 'nav.costOptimization.bomCost',
  'analyze': 'nav.costOptimization.analyze',
  'advisor': 'nav.costOptimization.advisor',
  'autonomy': 'nav.costOptimization.autonomy',
  'substitutes': 'nav.costOptimization.substitutes',
  'roadmap': 'nav.costOptimization.roadmap',
  'data-migration': 'nav.dataMigration',
};

// Map parent route to API endpoint + display field for resolving entity IDs
const ENTITY_RESOLVE_MAP: Record<string, { endpoint: string; displayField: string; codeField?: string }> = {
  parts: { endpoint: '/api/parts', displayField: 'name', codeField: 'partNumber' },
  suppliers: { endpoint: '/api/suppliers', displayField: 'name', codeField: 'code' },
  customers: { endpoint: '/api/customers', displayField: 'name', codeField: 'code' },
  purchasing: { endpoint: '/api/purchasing', displayField: 'poNumber' },
  orders: { endpoint: '/api/orders', displayField: 'orderNumber' },
  production: { endpoint: '/api/production', displayField: 'woNumber' },
  inventory: { endpoint: '/api/inventory', displayField: 'name', codeField: 'partNumber' },
  warehouses: { endpoint: '/api/warehouses', displayField: 'name', codeField: 'code' },
  bom: { endpoint: '/api/bom', displayField: 'name', codeField: 'sku' },
};

// Check if a string looks like a CUID or UUID (entity ID)
function isEntityId(segment: string): boolean {
  // CUID: starts with 'c' + 24+ alphanumeric, or UUID pattern
  return /^c[a-z0-9]{24,}$/i.test(segment) || /^[0-9a-f]{8}-[0-9a-f]{4}/.test(segment);
}

interface BreadcrumbItem {
  labelKey: string | null;
  fallbackLabel: string;
  href: string;
  isCurrent: boolean;
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const labelKey = routeLabelKeys[path] || null;
    const fallbackLabel = path.charAt(0).toUpperCase() + path.slice(1);
    breadcrumbs.push({
      labelKey,
      fallbackLabel,
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
  const { t } = useLanguage();
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Resolve entity IDs to display names
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    const toResolve: Array<{ id: string; parentRoute: string }> = [];

    segments.forEach((seg, idx) => {
      if (isEntityId(seg) && idx > 0) {
        const parentRoute = segments[idx - 1];
        if (ENTITY_RESOLVE_MAP[parentRoute]) {
          toResolve.push({ id: seg, parentRoute });
        }
      }
    });

    if (toResolve.length === 0) return;

    toResolve.forEach(({ id, parentRoute }) => {
      const config = ENTITY_RESOLVE_MAP[parentRoute];
      fetch(`${config.endpoint}/${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          // Handle nested response formats
          const entity = data.data || data;
          const code = config.codeField ? entity[config.codeField] : null;
          const name = entity[config.displayField];
          const label = code || name || null;
          if (label) {
            setResolvedNames((prev) => ({ ...prev, [id]: label }));
          }
        })
        .catch(() => {});
    });
  }, [pathname]);

  const getLabel = (item: BreadcrumbItem) => {
    // Check if this item's path segment is a resolved entity ID
    const lastSegment = item.href.split('/').pop() || '';
    if (resolvedNames[lastSegment]) {
      return resolvedNames[lastSegment];
    }
    return item.labelKey ? t(item.labelKey) : item.fallbackLabel;
  };

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
                <span className="sr-only">{t('nav.home')}</span>
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
                  {getLabel(item)}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                >
                  {getLabel(item)}
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
