// =============================================================================
// 🎯 MODERN HEADER WITH MEGA MENU
// Premium UI/UX - Linear/Notion/Figma inspired
// =============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface MegaMenuItem {
  id: string;
  label: string;
  labelVi: string;
  description?: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
  isNew?: boolean;
}

interface MegaMenuSection {
  title: string;
  titleVi: string;
  items: MegaMenuItem[];
}

interface NavTab {
  id: string;
  label: string;
  labelVi: string;
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
    label: 'Operations',
    labelVi: 'Vận hành',
    icon: <Zap className="w-4 h-4" />,
    sections: [
      {
        title: 'Sales & Orders',
        titleVi: 'Bán hàng',
        items: [
          { id: 'sales', label: 'Sales Orders', labelVi: 'Đơn hàng', description: 'Manage customer orders', icon: <ShoppingCart className="w-5 h-5" />, href: '/sales', color: 'text-violet-600 bg-violet-50' },
          { id: 'customers', label: 'Customers', labelVi: 'Khách hàng', description: 'Customer management', icon: <Users className="w-5 h-5" />, href: '/customer', color: 'text-blue-600 bg-blue-50' },
          { id: 'quotes', label: 'Quotations', labelVi: 'Báo giá', description: 'Sales quotations', icon: <FileText className="w-5 h-5" />, href: '/sales/quotes', color: 'text-indigo-600 bg-indigo-50' },
        ]
      },
      {
        title: 'Inventory',
        titleVi: 'Kho hàng',
        items: [
          { id: 'inventory', label: 'Inventory', labelVi: 'Tồn kho', description: 'Stock management', icon: <Package className="w-5 h-5" />, href: '/inventory', color: 'text-emerald-600 bg-emerald-50' },
          { id: 'parts', label: 'Parts Master', labelVi: 'Danh mục vật tư', description: 'Part catalog', icon: <Box className="w-5 h-5" />, href: '/parts', color: 'text-teal-600 bg-teal-50' },
          { id: 'bom', label: 'Bill of Materials', labelVi: 'Định mức BOM', description: 'BOM management', icon: <Layers className="w-5 h-5" />, href: '/bom', color: 'text-cyan-600 bg-cyan-50' },
        ]
      },
      {
        title: 'Purchasing',
        titleVi: 'Mua hàng',
        items: [
          { id: 'purchasing', label: 'Purchase Orders', labelVi: 'Đơn mua hàng', description: 'PO management', icon: <Truck className="w-5 h-5" />, href: '/purchasing', color: 'text-orange-600 bg-orange-50', badge: '3' },
          { id: 'suppliers', label: 'Suppliers', labelVi: 'Nhà cung cấp', description: 'Supplier management', icon: <Building2 className="w-5 h-5" />, href: '/supplier', color: 'text-amber-600 bg-amber-50' },
          { id: 'receiving', label: 'Receiving', labelVi: 'Nhận hàng', description: 'Goods receipt', icon: <Download className="w-5 h-5" />, href: '/receiving', color: 'text-lime-600 bg-lime-50' },
        ]
      },
    ],
    quickActions: [
      { id: 'new-so', label: 'New Sales Order', labelVi: 'Tạo đơn hàng', icon: <Plus className="w-4 h-4" />, href: '/sales/new', color: 'text-violet-600 bg-violet-100' },
      { id: 'new-po', label: 'New Purchase Order', labelVi: 'Tạo đơn mua', icon: <Plus className="w-4 h-4" />, href: '/purchasing/new', color: 'text-orange-600 bg-orange-100' },
    ]
  },
  {
    id: 'production',
    label: 'Production',
    labelVi: 'Sản xuất',
    icon: <Factory className="w-4 h-4" />,
    sections: [
      {
        title: 'Manufacturing',
        titleVi: 'Sản xuất',
        items: [
          { id: 'work-orders', label: 'Work Orders', labelVi: 'Lệnh sản xuất', description: 'Production orders', icon: <Factory className="w-5 h-5" />, href: '/production', color: 'text-orange-600 bg-orange-50' },
          { id: 'scheduling', label: 'Scheduling', labelVi: 'Lập lịch', description: 'Production schedule', icon: <CalendarDays className="w-5 h-5" />, href: '/scheduling', color: 'text-blue-600 bg-blue-50' },
          { id: 'shop-floor', label: 'Shop Floor', labelVi: 'Xưởng SX', description: 'Real-time tracking', icon: <Activity className="w-5 h-5" />, href: '/shop-floor', color: 'text-emerald-600 bg-emerald-50', isNew: true },
        ]
      },
      {
        title: 'Planning',
        titleVi: 'Hoạch định',
        items: [
          { id: 'mrp', label: 'MRP Planning', labelVi: 'Hoạch định MRP', description: 'Material requirements', icon: <Calculator className="w-5 h-5" />, href: '/mrp-wizard', color: 'text-purple-600 bg-purple-50' },
          { id: 'capacity', label: 'Capacity Planning', labelVi: 'Hoạch định năng lực', description: 'Resource capacity', icon: <Gauge className="w-5 h-5" />, href: '/mrp-capacity', color: 'text-indigo-600 bg-indigo-50' },
          { id: 'resource', label: 'Resource Planning', labelVi: 'Nguồn lực', description: 'Resource allocation', icon: <Target className="w-5 h-5" />, href: '/resource-planning', color: 'text-pink-600 bg-pink-50' },
        ]
      },
      {
        title: 'Resources',
        titleVi: 'Tài nguyên',
        items: [
          { id: 'workcenters', label: 'Work Centers', labelVi: 'Trung tâm SX', description: 'Work center setup', icon: <Cog className="w-5 h-5" />, href: '/workcenters', color: 'text-slate-600 bg-slate-50' },
          { id: 'equipment', label: 'Equipment', labelVi: 'Thiết bị', description: 'Machine management', icon: <Wrench className="w-5 h-5" />, href: '/equipment', color: 'text-gray-600 bg-gray-50' },
          { id: 'workforce', label: 'Workforce', labelVi: 'Nhân công', description: 'Labor management', icon: <Users className="w-5 h-5" />, href: '/workforce', color: 'text-sky-600 bg-sky-50' },
        ]
      },
    ],
    quickActions: [
      { id: 'new-wo', label: 'New Work Order', labelVi: 'Tạo lệnh SX', icon: <Plus className="w-4 h-4" />, href: '/production/new', color: 'text-orange-600 bg-orange-100' },
      { id: 'run-mrp', label: 'Run MRP', labelVi: 'Chạy MRP', icon: <Zap className="w-4 h-4" />, href: '/mrp-wizard', color: 'text-purple-600 bg-purple-100' },
    ]
  },
  {
    id: 'quality',
    label: 'Quality',
    labelVi: 'Chất lượng',
    icon: <Shield className="w-4 h-4" />,
    sections: [
      {
        title: 'Quality Control',
        titleVi: 'Kiểm soát CL',
        items: [
          { id: 'quality', label: 'Quality Records', labelVi: 'Hồ sơ CL', description: 'QC inspection', icon: <ClipboardCheck className="w-5 h-5" />, href: '/quality', color: 'text-teal-600 bg-teal-50' },
          { id: 'spc', label: 'SPC Charts', labelVi: 'Biểu đồ SPC', description: 'Statistical control', icon: <BarChart3 className="w-5 h-5" />, href: '/quality/spc', color: 'text-blue-600 bg-blue-50' },
          { id: 'capability', label: 'Process Capability', labelVi: 'Năng lực QT', description: 'Cp, Cpk analysis', icon: <Target className="w-5 h-5" />, href: '/quality/capability', color: 'text-indigo-600 bg-indigo-50' },
        ]
      },
      {
        title: 'Performance',
        titleVi: 'Hiệu suất',
        items: [
          { id: 'oee', label: 'OEE Dashboard', labelVi: 'OEE Dashboard', description: 'Equipment efficiency', icon: <Activity className="w-5 h-5" />, href: '/oee', color: 'text-emerald-600 bg-emerald-50', badge: 'Live' },
          { id: 'downtime', label: 'Downtime Tracking', labelVi: 'Theo dõi dừng máy', description: 'Machine downtime', icon: <Clock className="w-5 h-5" />, href: '/downtime', color: 'text-red-600 bg-red-50' },
          { id: 'maintenance', label: 'Maintenance', labelVi: 'Bảo trì', description: 'Preventive maintenance', icon: <Wrench className="w-5 h-5" />, href: '/maintenance', color: 'text-amber-600 bg-amber-50' },
        ]
      },
      {
        title: 'Alerts & Actions',
        titleVi: 'Cảnh báo',
        items: [
          { id: 'alerts', label: 'Alert Center', labelVi: 'Trung tâm cảnh báo', description: 'All system alerts', icon: <AlertTriangle className="w-5 h-5" />, href: '/alerts', color: 'text-orange-600 bg-orange-50', badge: '5' },
          { id: 'nc', label: 'Non-Conformance', labelVi: 'Không phù hợp', description: 'NC management', icon: <X className="w-5 h-5" />, href: '/quality/nc', color: 'text-red-600 bg-red-50' },
        ]
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    labelVi: 'Phân tích',
    icon: <PieChart className="w-4 h-4" />,
    sections: [
      {
        title: 'Dashboards',
        titleVi: 'Dashboard',
        items: [
          { id: 'overview', label: 'Overview', labelVi: 'Tổng quan', description: 'Main dashboard', icon: <LayoutGrid className="w-5 h-5" />, href: '/dashboard', color: 'text-blue-600 bg-blue-50' },
          { id: 'analytics', label: 'Analytics', labelVi: 'Phân tích', description: 'Advanced analytics', icon: <TrendingUp className="w-5 h-5" />, href: '/analytics', color: 'text-violet-600 bg-violet-50' },
          { id: 'realtime', label: 'Real-time', labelVi: 'Thời gian thực', description: 'Live monitoring', icon: <Activity className="w-5 h-5" />, href: '/realtime', color: 'text-emerald-600 bg-emerald-50', isNew: true },
        ]
      },
      {
        title: 'Reports',
        titleVi: 'Báo cáo',
        items: [
          { id: 'reports', label: 'Reports', labelVi: 'Báo cáo', description: 'Report center', icon: <FileText className="w-5 h-5" />, href: '/reports', color: 'text-slate-600 bg-slate-50' },
          { id: 'ai-insights', label: 'AI Insights', labelVi: 'AI Insights', description: 'AI predictions', icon: <Sparkles className="w-5 h-5" />, href: '/ai-insights', color: 'text-purple-600 bg-purple-50', isNew: true },
        ]
      },
      {
        title: 'Finance',
        titleVi: 'Tài chính',
        items: [
          { id: 'costing', label: 'Costing', labelVi: 'Chi phí', description: 'Cost analysis', icon: <DollarSign className="w-5 h-5" />, href: '/finance/costing', color: 'text-green-600 bg-green-50' },
          { id: 'invoicing', label: 'Invoicing', labelVi: 'Hóa đơn', description: 'Invoice management', icon: <Receipt className="w-5 h-5" />, href: '/finance/invoicing', color: 'text-amber-600 bg-amber-50' },
        ]
      },
    ],
  },
];

// Quick Create menu items
const quickCreateItems: MegaMenuItem[] = [
  { id: 'new-so', label: 'Sales Order', labelVi: 'Đơn hàng', icon: <ShoppingCart className="w-4 h-4" />, href: '/sales/new', color: 'text-violet-600' },
  { id: 'new-po', label: 'Purchase Order', labelVi: 'Đơn mua', icon: <Truck className="w-4 h-4" />, href: '/purchasing/new', color: 'text-orange-600' },
  { id: 'new-wo', label: 'Work Order', labelVi: 'Lệnh SX', icon: <Factory className="w-4 h-4" />, href: '/production/new', color: 'text-blue-600' },
  { id: 'new-part', label: 'New Part', labelVi: 'Vật tư mới', icon: <Box className="w-4 h-4" />, href: '/parts/new', color: 'text-emerald-600' },
  { id: 'new-quality', label: 'Quality Record', labelVi: 'Hồ sơ CL', icon: <ClipboardCheck className="w-4 h-4" />, href: '/quality/new', color: 'text-teal-600' },
];

// =============================================================================
// MEGA MENU COMPONENT
// =============================================================================

interface MegaMenuProps {
  tab: NavTab;
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'vi';
}

function MegaMenu({ tab, isOpen, onClose, language }: MegaMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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
        'absolute left-0 top-full mt-1 w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700',
        'animate-in fade-in slide-in-from-top-2 duration-200',
        'max-h-[70vh] overflow-y-auto'
      )}
      style={{ minWidth: '700px', maxWidth: '900px' }}
    >
      <div className="p-6">
        {/* Sections Grid */}
        <div className="grid grid-cols-3 gap-6">
          {tab.sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                {language === 'vi' ? section.titleVi : section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                      item.color
                    )}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {language === 'vi' ? item.labelVi : item.label}
                        </span>
                        {item.badge && (
                          <span className={cn(
                            'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                            item.badge === 'Live' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            item.badge === 'New' || item.isNew ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          )}>
                            {item.isNew ? 'New' : item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        {tab.quickActions && tab.quickActions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Quick Actions:</span>
              {tab.quickActions.map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  onClick={onClose}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    action.color,
                    'hover:opacity-80'
                  )}
                >
                  {action.icon}
                  <span>{language === 'vi' ? action.labelVi : action.label}</span>
                </Link>
              ))}
            </div>
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
  language: 'en' | 'vi';
}

function QuickCreateDropdown({ isOpen, onClose, language }: QuickCreateDropdownProps) {
  if (!isOpen) return null;

  return (
    <div className={cn(
      'absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700',
      'animate-in fade-in slide-in-from-top-2 duration-200'
    )}>
      <div className="p-2">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
          {language === 'vi' ? 'Tạo mới' : 'Quick Create'}
        </div>
        {quickCreateItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <span className={item.color}>{item.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {language === 'vi' ? item.labelVi : item.label}
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
  language: 'en' | 'vi';
}

function CommandPalette({ isOpen, onClose, language }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.labelVi.toLowerCase().includes(query.toLowerCase()) ||
        (item.description?.toLowerCase().includes(query.toLowerCase()))
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
        'relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700',
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
            placeholder={language === 'vi' ? 'Tìm kiếm tính năng...' : 'Search for anything...'}
            className="flex-1 bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {language === 'vi' ? 'Không tìm thấy kết quả' : 'No results found'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    item.color
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {language === 'vi' ? item.labelVi : item.label}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.description}
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
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↵</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd>
              to navigate
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />K to open
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
  language: 'en' | 'vi';
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

function UserDropdown({ isOpen, onClose, user, language, darkMode, onToggleDarkMode, onLogout }: UserDropdownProps) {
  if (!isOpen) return null;

  return (
    <div className={cn(
      'absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700',
      'animate-in fade-in slide-in-from-top-2 duration-200'
    )}>
      {/* User Info */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <UserCircle className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {language === 'vi' ? 'Hồ sơ cá nhân' : 'Profile'}
          </span>
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <Settings className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {language === 'vi' ? 'Cài đặt' : 'Settings'}
          </span>
        </Link>
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5 text-gray-400" /> : <Sun className="w-5 h-5 text-gray-400" />}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {language === 'vi' ? 'Giao diện tối' : 'Dark Mode'}
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <HelpCircle className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {language === 'vi' ? 'Trợ giúp' : 'Help Center'}
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
            {language === 'vi' ? 'Đăng xuất' : 'Log Out'}
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
  onSidebarToggle,
}: ModernHeaderProps) {
  const pathname = usePathname();
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
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center h-16 px-4 gap-2">
          {/* Back to Home */}
          <Link
            href="/"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mr-4"
            title={language === 'vi' ? 'Về trang chủ' : 'Back to Home'}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>

          {/* Home Button */}
          <Link
            href="/dashboard"
            className={cn(
              'hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              pathname === '/dashboard' 
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            )}
          >
            <Home className="w-4 h-4" />
            <span>{language === 'vi' ? 'Tổng quan' : 'Home'}</span>
          </Link>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {navigationTabs.map((tab) => (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === tab.id 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  {tab.icon}
                  <span>{language === 'vi' ? tab.labelVi : tab.label}</span>
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform',
                    activeTab === tab.id && 'rotate-180'
                  )} />
                </button>

                {/* Mega Menu */}
                <MegaMenu
                  tab={tab}
                  isOpen={activeTab === tab.id}
                  onClose={() => setActiveTab(null)}
                  language={language}
                />
              </div>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search / Command Palette Trigger */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="hidden sm:flex items-center gap-3 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all min-w-[200px]"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">{language === 'vi' ? 'Tìm kiếm...' : 'Search...'}</span>
            <kbd className="ml-auto hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>

          {/* Quick Create */}
          <div className="relative">
            <button
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="flex items-center justify-center w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/20 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
            <QuickCreateDropdown
              isOpen={showQuickCreate}
              onClose={() => setShowQuickCreate(false)}
              language={language}
            />
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => onLanguageChange?.(language === 'vi' ? 'en' : 'vi')}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <Globe className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {user.name.charAt(0)}
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
            </button>
            <UserDropdown
              isOpen={showUserMenu}
              onClose={() => setShowUserMenu(false)}
              user={user}
              language={language}
              darkMode={darkMode}
              onToggleDarkMode={onToggleDarkMode}
              onLogout={onLogout}
            />
          </div>

          {/* Mobile Menu Toggle */}
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        language={language}
      />
    </>
  );
}

export default ModernHeader;
