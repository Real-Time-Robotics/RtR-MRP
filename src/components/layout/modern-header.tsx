// =============================================================================
// 🎯 MODERN HEADER WITH MEGA MENU
// Premium UI/UX - Linear/Notion/Figma inspired
// =============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useNavigationHistory } from '@/hooks/use-navigation-history';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  Search,
  Bell,
  Settings,
  User,
  ChevronDown,
  ChevronLeft,
  LogOut,
  Moon,
  Sun,
  Command,
  Plus,
  Package,
  ShoppingCart,
  Factory,
  Truck,
  ClipboardCheck,
  BarChart3,
  Calculator,
  Layers,
  Activity,
  FileText,
  Users,
  Wrench,
  AlertTriangle,
  Sparkles,
  Target,
  Clock,
  Star,
  Globe,
  Zap,
  Box,
  TrendingUp,
  PieChart,
  Gauge,
  Shield,
  Cog,
  Building2,
  UserCircle,
  Database,
  Upload,
  Download,
  HelpCircle,
  X,
  ArrowRight,
  Smartphone,
  CalendarDays,
  DollarSign,
  Receipt,
  Wallet,
  CreditCard,
  BadgeCheck,
  LayoutGrid,
  Home,
  PauseCircle,
  Trash2,
  FileUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScreenshotButton } from '@/components/ui/screenshot-button';

// =============================================================================
// TYPES
// =============================================================================

interface MegaMenuItem {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
  isNew?: boolean;
}

interface MegaMenuSection {
  titleKey: string;
  items: MegaMenuItem[];
}

interface NavTab {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  sections: MegaMenuSection[];
  quickActions?: MegaMenuItem[];
}

// =============================================================================
// NAVIGATION DATA
// =============================================================================

const navigationTabs: NavTab[] = [
  {
    id: 'operations',
    labelKey: 'header.operationsTab',
    icon: <Zap className="w-4 h-4" />,
    sections: [
      {
        titleKey: 'header.salesAndOrders',
        items: [
          { id: 'sales', labelKey: 'header.salesOrders', descriptionKey: 'header.desc.salesOrders', icon: <ShoppingCart className="w-5 h-5" />, href: '/sales', color: 'text-violet-600 bg-violet-50' },
          { id: 'customers', labelKey: 'header.customers', descriptionKey: 'header.desc.customers', icon: <Users className="w-5 h-5" />, href: '/customers', color: 'text-blue-600 bg-blue-50' },
          { id: 'quotes', labelKey: 'header.quotations', descriptionKey: 'header.desc.quotations', icon: <FileText className="w-5 h-5" />, href: '/orders', color: 'text-indigo-600 bg-indigo-50' },
        ]
      },
      {
        titleKey: 'header.inventorySection',
        items: [
          { id: 'inventory', labelKey: 'header.inventoryItem', descriptionKey: 'header.desc.inventory', icon: <Package className="w-5 h-5" />, href: '/inventory', color: 'text-emerald-600 bg-emerald-50' },
          { id: 'parts', labelKey: 'header.partsMaster', descriptionKey: 'header.desc.partsMaster', icon: <Box className="w-5 h-5" />, href: '/parts', color: 'text-teal-600 bg-teal-50' },
          { id: 'bom', labelKey: 'header.billOfMaterials', descriptionKey: 'header.desc.bom', icon: <Layers className="w-5 h-5" />, href: '/bom', color: 'text-cyan-600 bg-cyan-50' },
          { id: 'smart-import', labelKey: 'header.smartImport', descriptionKey: 'header.desc.smartImport', icon: <FileUp className="w-5 h-5" />, href: '/import/smart', color: 'text-purple-600 bg-purple-50', isNew: true },
        ]
      },
      {
        titleKey: 'header.purchasingSection',
        items: [
          { id: 'purchasing', labelKey: 'header.purchaseOrders', descriptionKey: 'header.desc.purchaseOrders', icon: <Truck className="w-5 h-5" />, href: '/purchasing', color: 'text-orange-600 bg-orange-50', badge: '3' },
          { id: 'suppliers', labelKey: 'header.suppliers', descriptionKey: 'header.desc.suppliers', icon: <Building2 className="w-5 h-5" />, href: '/suppliers', color: 'text-amber-600 bg-amber-50' },
          { id: 'receiving', labelKey: 'header.receiving', descriptionKey: 'header.desc.receiving', icon: <Download className="w-5 h-5" />, href: '/quality/receiving', color: 'text-lime-600 bg-lime-50' },
        ]
      },
    ],
    quickActions: [
      { id: 'new-so', labelKey: 'header.newSalesOrder', icon: <Plus className="w-4 h-4" />, href: '/sales', color: 'text-violet-600 bg-violet-100' },
      { id: 'new-po', labelKey: 'header.newPurchaseOrder', icon: <Plus className="w-4 h-4" />, href: '/purchasing', color: 'text-orange-600 bg-orange-100' },
    ]
  },
  {
    id: 'production',
    labelKey: 'header.productionTab',
    icon: <Factory className="w-4 h-4" />,
    sections: [
      {
        titleKey: 'header.manufacturing',
        items: [
          { id: 'work-orders', labelKey: 'header.workOrders', descriptionKey: 'header.desc.workOrders', icon: <Factory className="w-5 h-5" />, href: '/production', color: 'text-orange-600 bg-orange-50' },
          { id: 'scheduling', labelKey: 'header.scheduling', descriptionKey: 'header.desc.scheduling', icon: <CalendarDays className="w-5 h-5" />, href: '/production/schedule', color: 'text-blue-600 bg-blue-50' },
          { id: 'shop-floor', labelKey: 'header.shopFloor', descriptionKey: 'header.desc.shopFloor', icon: <Activity className="w-5 h-5" />, href: '/production/shop-floor', color: 'text-emerald-600 bg-emerald-50', isNew: true },
        ]
      },
      {
        titleKey: 'header.planning',
        items: [
          { id: 'mrp', labelKey: 'header.mrpPlanning', descriptionKey: 'header.desc.mrp', icon: <Calculator className="w-5 h-5" />, href: '/mrp', color: 'text-purple-600 bg-purple-50' },
          { id: 'capacity', labelKey: 'header.capacityPlanning', descriptionKey: 'header.desc.capacity', icon: <Gauge className="w-5 h-5" />, href: '/production/capacity', color: 'text-indigo-600 bg-indigo-50' },
          { id: 'resource', labelKey: 'header.resourcePlanning', descriptionKey: 'header.desc.resource', icon: <Target className="w-5 h-5" />, href: '/mrp/planning', color: 'text-pink-600 bg-pink-50' },
        ]
      },
      {
        titleKey: 'header.resources',
        items: [
          { id: 'workcenters', labelKey: 'header.workCenters', descriptionKey: 'header.desc.workCenters', icon: <Cog className="w-5 h-5" />, href: '/production/work-centers', color: 'text-slate-600 bg-slate-50' },
          { id: 'equipment', labelKey: 'header.equipment', descriptionKey: 'header.desc.equipment', icon: <Wrench className="w-5 h-5" />, href: '/production/equipment', color: 'text-gray-600 bg-gray-50' },
          { id: 'workforce', labelKey: 'header.workforce', descriptionKey: 'header.desc.workforce', icon: <Users className="w-5 h-5" />, href: '/production/capacity', color: 'text-sky-600 bg-sky-50' },
        ]
      },
    ],
    quickActions: [
      { id: 'new-wo', labelKey: 'header.newWorkOrder', icon: <Plus className="w-4 h-4" />, href: '/production', color: 'text-orange-600 bg-orange-100' },
      { id: 'run-mrp', labelKey: 'header.runMRP', icon: <Zap className="w-4 h-4" />, href: '/mrp', color: 'text-purple-600 bg-purple-100' },
    ]
  },
  {
    id: 'quality',
    labelKey: 'header.qualityTab',
    icon: <Shield className="w-4 h-4" />,
    sections: [
      {
        titleKey: 'header.qualityControl',
        items: [
          { id: 'quality', labelKey: 'header.qualityRecords', descriptionKey: 'header.desc.quality', icon: <ClipboardCheck className="w-5 h-5" />, href: '/quality', color: 'text-teal-600 bg-teal-50' },
          { id: 'spc', labelKey: 'header.spcCharts', descriptionKey: 'header.desc.spc', icon: <BarChart3 className="w-5 h-5" />, href: '/quality/spc', color: 'text-blue-600 bg-blue-50' },
          { id: 'capability', labelKey: 'header.processCapability', descriptionKey: 'header.desc.capability', icon: <Target className="w-5 h-5" />, href: '/quality/capability', color: 'text-indigo-600 bg-indigo-50' },
        ]
      },
      {
        titleKey: 'header.performance',
        items: [
          { id: 'oee', labelKey: 'header.oeeDashboard', descriptionKey: 'header.desc.oee', icon: <Activity className="w-5 h-5" />, href: '/production/oee', color: 'text-emerald-600 bg-emerald-50', badge: 'Live' },
          { id: 'downtime', labelKey: 'header.downtimeTracking', descriptionKey: 'header.desc.downtime', icon: <Clock className="w-5 h-5" />, href: '/production/oee', color: 'text-red-600 bg-red-50' },
          { id: 'maintenance', labelKey: 'header.maintenance', descriptionKey: 'header.desc.maintenance', icon: <Wrench className="w-5 h-5" />, href: '/production/routing', color: 'text-amber-600 bg-amber-50' },
        ]
      },
      {
        titleKey: 'header.alertsAndActions',
        items: [
          { id: 'alerts', labelKey: 'header.alertCenter', descriptionKey: 'header.desc.alerts', icon: <AlertTriangle className="w-5 h-5" />, href: '/alerts', color: 'text-orange-600 bg-orange-50', badge: '5' },
          { id: 'nc', labelKey: 'header.nonConformance', descriptionKey: 'header.desc.nc', icon: <X className="w-5 h-5" />, href: '/quality/ncr', color: 'text-red-600 bg-red-50' },
          { id: 'hold', labelKey: 'header.holdInventory', descriptionKey: 'header.desc.hold', icon: <PauseCircle className="w-5 h-5" />, href: '/quality/hold', color: 'text-amber-600 bg-amber-50' },
          { id: 'scrap', labelKey: 'header.scrapInventory', descriptionKey: 'header.desc.scrap', icon: <Trash2 className="w-5 h-5" />, href: '/quality/scrap', color: 'text-red-600 bg-red-50' },
        ]
      },
    ],
  },
  {
    id: 'analytics',
    labelKey: 'header.analyticsTab',
    icon: <PieChart className="w-4 h-4" />,
    sections: [
      {
        titleKey: 'header.dashboards',
        items: [
          { id: 'overview', labelKey: 'header.overview', descriptionKey: 'header.desc.overview', icon: <LayoutGrid className="w-5 h-5" />, href: '/home', color: 'text-blue-600 bg-blue-50' },
          { id: 'analytics', labelKey: 'header.analyticsItem', descriptionKey: 'header.desc.analytics', icon: <TrendingUp className="w-5 h-5" />, href: '/analytics', color: 'text-violet-600 bg-violet-50' },
          { id: 'realtime', labelKey: 'header.realtime', descriptionKey: 'header.desc.realtime', icon: <Activity className="w-5 h-5" />, href: '/analytics', color: 'text-emerald-600 bg-emerald-50', isNew: true },
        ]
      },
      {
        titleKey: 'header.reportsSection',
        items: [
          { id: 'reports', labelKey: 'header.reports', descriptionKey: 'header.desc.reports', icon: <FileText className="w-5 h-5" />, href: '/reports', color: 'text-slate-600 bg-slate-50' },
          { id: 'ai-insights', labelKey: 'header.aiInsights', descriptionKey: 'header.desc.aiInsights', icon: <Sparkles className="w-5 h-5" />, href: '/ai-insights', color: 'text-purple-600 bg-purple-50', isNew: true },
        ]
      },
      {
        titleKey: 'header.financeSection',
        items: [
          { id: 'costing', labelKey: 'header.costing', descriptionKey: 'header.desc.costing', icon: <DollarSign className="w-5 h-5" />, href: '/finance/costing', color: 'text-green-600 bg-green-50' },
          { id: 'invoicing', labelKey: 'header.invoicing', descriptionKey: 'header.desc.invoicing', icon: <Receipt className="w-5 h-5" />, href: '/finance/invoicing', color: 'text-amber-600 bg-amber-50' },
        ]
      },
    ],
  },
];

// Quick Create menu items
const quickCreateItems: MegaMenuItem[] = [
  { id: 'new-so', labelKey: 'header.salesOrder', icon: <ShoppingCart className="w-4 h-4" />, href: '/sales', color: 'text-violet-600' },
  { id: 'new-po', labelKey: 'header.purchaseOrder', icon: <Truck className="w-4 h-4" />, href: '/purchasing', color: 'text-orange-600' },
  { id: 'new-wo', labelKey: 'header.workOrder', icon: <Factory className="w-4 h-4" />, href: '/production', color: 'text-blue-600' },
  { id: 'new-part', labelKey: 'header.newPart', icon: <Box className="w-4 h-4" />, href: '/parts', color: 'text-emerald-600' },
  { id: 'new-quality', labelKey: 'header.qualityRecord', icon: <ClipboardCheck className="w-4 h-4" />, href: '/quality', color: 'text-teal-600' },
];

// =============================================================================
// MEGA MENU COMPONENT
// =============================================================================

interface MegaMenuProps {
  tab: NavTab;
  isOpen: boolean;
  onClose: () => void;
}

function MegaMenu({ tab, isOpen, onClose }: MegaMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute left-0 top-full mt-0.5 bg-white dark:bg-steel-dark rounded-lg shadow-xl border border-gray-200 dark:border-gray-700',
        'animate-in fade-in slide-in-from-top-1 duration-150',
      )}
      style={{ minWidth: '480px', maxWidth: '600px' }}
    >
      <div className="p-3">
        {/* Sections Grid */}
        <div className="grid grid-cols-3 gap-3">
          {tab.sections.map((section) => (
            <div key={section.titleKey}>
              <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1.5">
                {t(section.titleKey)}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gunmetal transition-colors group"
                  >
                    <span className={cn('flex-shrink-0', item.color.split(' ')[0])}>
                      {React.cloneElement(item.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                      {t(item.labelKey)}
                    </span>
                    {item.badge && (
                      <span className={cn(
                        'ml-auto px-1 py-0 text-[9px] font-bold rounded-full flex-shrink-0',
                        item.badge === 'Live' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        item.isNew ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      )}>
                        {item.isNew ? t('header.new') : item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        {tab.quickActions && tab.quickActions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
            {tab.quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                onClick={onClose}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors',
                  action.color,
                  'hover:opacity-80'
                )}
              >
                {React.cloneElement(action.icon as React.ReactElement, { className: 'w-3 h-3' })}
                <span>{t(action.labelKey)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// QUICK CREATE DROPDOWN
// =============================================================================

interface QuickCreateDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

function QuickCreateDropdown({ isOpen, onClose }: QuickCreateDropdownProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className={cn(
      'absolute right-0 top-full mt-2 w-56 bg-white dark:bg-steel-dark rounded-xl shadow-xl border border-gray-200 dark:border-gray-700',
      'animate-in fade-in slide-in-from-top-2 duration-200'
    )}>
      <div className="p-2">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
          {t('header.quickCreate')}
        </div>
        {quickCreateItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gunmetal transition-all"
          >
            <span className={item.color}>{item.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t(item.labelKey)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// COMMAND PALETTE
// =============================================================================

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Flatten all menu items for search
  const allItems = navigationTabs.flatMap(tab =>
    tab.sections.flatMap(section => section.items)
  );

  const filteredItems = query
    ? allItems.filter(item =>
        t(item.labelKey).toLowerCase().includes(query.toLowerCase()) ||
        (item.descriptionKey && t(item.descriptionKey).toLowerCase().includes(query.toLowerCase()))
      )
    : allItems.slice(0, 8);

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-xl bg-white dark:bg-steel-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700',
        'animate-in fade-in zoom-in-95 duration-200'
      )}>
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('header.searchFeatures')}
            className="flex-1 bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gunmetal rounded text-xs text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {t('nav.noResults')}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gunmetal transition-all text-left"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    item.color
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {t(item.labelKey)}
                    </div>
                    {item.descriptionKey && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {t(item.descriptionKey)}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gunmetal rounded">↵</kbd>
              {t('header.toSelect')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gunmetal rounded">↑↓</kbd>
              {t('header.toNavigate')}
            </span>
          </div>
          <span className="flex items-center gap-1">
            ⌘K / Ctrl+K {t('header.toOpen')}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// USER DROPDOWN
// =============================================================================

interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string; role?: string };
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

function UserDropdown({ isOpen, onClose, user, darkMode, onToggleDarkMode, onLogout }: UserDropdownProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className={cn(
      'absolute right-0 top-full mt-2 w-72 bg-white dark:bg-steel-dark rounded-xl shadow-xl border border-gray-200 dark:border-gray-700',
      'animate-in fade-in slide-in-from-top-2 duration-200'
    )}>
      {/* User Info */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 font-bold text-lg">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white truncate">
              {user.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </div>
            {user.role && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                {user.role}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-2">
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gunmetal transition-all"
        >
          <UserCircle className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t('header.profile')}
          </span>
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gunmetal transition-all"
        >
          <Settings className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t('header.settings')}
          </span>
        </Link>
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gunmetal transition-all"
        >
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5 text-gray-400" /> : <Sun className="w-5 h-5 text-gray-400" />}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('header.darkMode')}
            </span>
          </div>
          <div className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          )}>
            <div className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
              darkMode ? 'translate-x-5' : 'translate-x-1'
            )} />
          </div>
        </button>
        <Link
          href="/help"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gunmetal transition-all"
        >
          <HelpCircle className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t('header.helpCenter')}
          </span>
        </Link>
      </div>

      {/* Logout */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">
            {t('header.logout')}
          </span>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN HEADER COMPONENT
// =============================================================================

export interface ModernHeaderProps {
  user?: { name: string; email: string; role?: string };
  notifications?: { id: string; title: string; read: boolean }[];
  language?: 'en' | 'vi';
  onLanguageChange?: (lang: 'en' | 'vi') => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogout?: () => void;
  onSidebarToggle?: () => void;
}

export function ModernHeader({
  user = { name: 'Admin User', email: 'admin@rtr.vn', role: 'Administrator' },
  notifications = [],
  language = 'vi',
  onLanguageChange,
  darkMode = false,
  onToggleDarkMode = () => {},
  onLogout = () => {},
}: ModernHeaderProps) {
  const pathname = usePathname();
  const { goBack, hasPreviousPage } = useNavigationHistory('/');
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Industrial Precision Header: Compact 48px, Sharp edges */}
      <header className="sticky top-0 z-40 bg-white dark:bg-steel-dark border-b border-gray-200 dark:border-mrp-border">
        <div className="flex items-center h-12 px-2 gap-2">
          {/* Back Button - w-12 matches sidebar collapsed width */}
          <button
            onClick={goBack}
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 dark:hover:bg-gunmetal transition-colors text-gray-500 dark:text-mrp-text-muted hover:text-info-cyan"
            title={t('nav.goBack')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Home Button - Industrial Style */}
          <Link
            href="/home"
            className={cn(
              'hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-mono tracking-wider transition-all border-l-2',
              (pathname === '/home' || pathname === '/dashboard')
                ? 'bg-gray-100 dark:bg-gunmetal border-l-info-cyan text-info-cyan'
                : 'border-l-transparent text-gray-600 dark:text-mrp-text-secondary hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-gray-900 dark:hover:text-mrp-text-primary'
            )}
          >
            <Home className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-left">{t('header.home')}</span>
          </Link>

          {/* Navigation Tabs - Industrial Style */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-2">
            {navigationTabs.map((tab) => (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-mono tracking-wider transition-all border-b-2',
                    activeTab === tab.id
                      ? 'bg-gray-100 dark:bg-gunmetal border-b-info-cyan text-info-cyan'
                      : 'border-b-transparent text-gray-600 dark:text-mrp-text-secondary hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-gray-900 dark:hover:text-mrp-text-primary'
                  )}
                >
                  <span className="flex-shrink-0">{tab.icon}</span>
                  <span className="uppercase text-left">{t(tab.labelKey)}</span>
                  <ChevronDown className={cn(
                    'w-3.5 h-3.5 flex-shrink-0 transition-transform',
                    activeTab === tab.id && 'rotate-180'
                  )} />
                </button>

                {/* Mega Menu */}
                <MegaMenu
                  tab={tab}
                  isOpen={activeTab === tab.id}
                  onClose={() => setActiveTab(null)}
                />
              </div>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search / Command Palette Trigger - Desktop */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gunmetal border border-gray-200 dark:border-mrp-border text-gray-500 dark:text-mrp-text-muted hover:bg-gray-200 dark:hover:bg-gunmetal-light hover:border-gray-300 dark:hover:border-info-cyan/30 transition-all min-w-[180px]"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{t('header.searchUpper')}</span>
            <kbd className="ml-auto hidden md:inline-flex items-center gap-1 px-1 py-0.5 bg-gray-200 dark:bg-steel-dark text-[10px] font-mono text-gray-500 dark:text-mrp-text-muted">
              ⌘K
            </kbd>
          </button>

          {/* Search - Mobile */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="sm:hidden flex items-center justify-center w-10 h-10 text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-info-cyan transition-all touch-manipulation"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Action Buttons - Compact group */}
          <div className="flex items-center gap-0.5">
            {/* Quick Create - Hidden on mobile */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                className="flex items-center justify-center w-7 h-7 text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-info-cyan transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <QuickCreateDropdown
                isOpen={showQuickCreate}
                onClose={() => setShowQuickCreate(false)}
              />
            </div>

            {/* Screenshot Button - Hidden on mobile */}
            <div className="hidden sm:block">
              <ScreenshotButton language={language} />
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => onLanguageChange?.(language === 'vi' ? 'en' : 'vi')}
              className="hidden xs:flex items-center justify-center w-7 h-7 text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-info-cyan transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="flex items-center justify-center w-7 h-7 text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-info-cyan transition-all"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center justify-center w-7 h-7 text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-info-cyan transition-all"
              >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 bg-urgent-red text-white text-[9px] font-bold font-mono flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gunmetal rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('header.notifications')}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {unreadCount} {t('header.unread')}
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('header.noNotifications')}
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                          !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                          <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                            {notification.title}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gunmetal/50">
                  <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline w-full text-center">
                    {t('header.viewAll')}
                  </button>
                </div>
              </div>
            )}
          </div>

            {/* User Menu */}
            <div className="relative ml-0.5">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gunmetal transition-all"
              >
                <div className="w-6 h-6 border border-gray-300 dark:border-mrp-border flex items-center justify-center text-gray-500 dark:text-mrp-text-muted font-mono text-[10px] bg-gray-100 dark:bg-transparent">
                  {user.name.charAt(0)}
                </div>
                <ChevronDown className="w-3 h-3 text-gray-500 dark:text-mrp-text-muted hidden sm:block" />
              </button>
            <UserDropdown
              isOpen={showUserMenu}
              onClose={() => setShowUserMenu(false)}
              user={user}
              darkMode={darkMode}
              onToggleDarkMode={onToggleDarkMode}
              onLogout={onLogout}
            />
            </div>
          </div>

        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </>
  );
}

export default ModernHeader;
