'use client';

import React, { useState, createContext, useContext } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Factory,
  ClipboardCheck,
  BarChart3,
  Settings,
  Users,
  HelpCircle,
  LogOut,
  Bot,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// SIDEBAR NAVIGATION COMPONENT
// Collapsible sidebar with nested menu items
// =============================================================================

export interface NavItem {
  id: string;
  label: string;
  labelVi?: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: string | number;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger';
  children?: NavItem[];
  divider?: boolean;
  section?: string;
}

export interface SidebarProps {
  /** Navigation items */
  items: NavItem[];
  /** Currently active item id */
  activeId?: string;
  /** Item click handler */
  onItemClick?: (item: NavItem) => void;
  /** Whether sidebar is collapsed */
  collapsed?: boolean;
  /** Toggle collapse handler */
  onToggleCollapse?: () => void;
  /** User info */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
  /** Logo/Brand */
  logo?: React.ReactNode;
  /** Collapsed logo */
  collapsedLogo?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Language */
  language?: 'en' | 'vi';
  /** Custom class */
  className?: string;
}

// Context for sidebar state
interface SidebarContextValue {
  collapsed: boolean;
  activeId: string;
  expandedItems: Set<string>;
  toggleExpanded: (id: string) => void;
  language: 'en' | 'vi';
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('Sidebar components must be used within a Sidebar');
  }
  return context;
};

// Badge colors
const badgeColors = {
  primary: 'bg-primary-500 text-white',
  success: 'bg-success-500 text-white',
  warning: 'bg-warning-500 text-white',
  danger: 'bg-danger-500 text-white',
};

// Navigation Item component
interface NavItemComponentProps {
  item: NavItem;
  level?: number;
  onClick?: (item: NavItem) => void;
}

const NavItemComponent: React.FC<NavItemComponentProps> = ({
  item,
  level = 0,
  onClick,
}) => {
  const { collapsed, activeId, expandedItems, toggleExpanded, language } = useSidebarContext();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activeId === item.id;
  const isExpanded = expandedItems.has(item.id);
  const label = language === 'vi' && item.labelVi ? item.labelVi : item.label;

  // Divider
  if (item.divider) {
    return <div className="my-2 border-t border-slate-700/50" />;
  }

  // Section header
  if (item.section) {
    if (collapsed) return null;
    return (
      <div className="px-4 pt-4 pb-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {item.section}
        </span>
      </div>
    );
  }

  const handleClick = () => {
    if (hasChildren && !collapsed) {
      toggleExpanded(item.id);
    } else if (onClick) {
      onClick(item);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 text-left',
          'transition-all duration-200 rounded-lg mx-2',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
          level > 0 && 'ml-6 mr-2',
          isActive
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? label : undefined}
      >
        {/* Icon */}
        {item.icon && (
          <span
            className={cn(
              'flex-shrink-0 w-5 h-5',
              isActive ? 'text-white' : 'text-slate-400'
            )}
          >
            {item.icon}
          </span>
        )}

        {/* Label */}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-sm font-medium">{label}</span>

            {/* Badge */}
            {item.badge && (
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  badgeColors[item.badgeColor || 'primary']
                )}
              >
                {item.badge}
              </span>
            )}

            {/* Expand icon */}
            {hasChildren && (
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </>
        )}
      </button>

      {/* Children */}
      {hasChildren && !collapsed && isExpanded && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <NavItemComponent
              key={child.id}
              item={child}
              level={level + 1}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main Sidebar component
const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeId = '',
  onItemClick,
  collapsed = false,
  onToggleCollapse,
  user,
  logo,
  collapsedLogo,
  footer,
  language = 'en',
  className,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{ collapsed, activeId, expandedItems, toggleExpanded, language }}
    >
      <aside
        className={cn(
          'flex flex-col h-screen bg-navy-900 text-white',
          'transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-60',
          className
        )}
      >
        {/* Header / Logo */}
        <div
          className={cn(
            'flex items-center h-16 px-4 border-b border-slate-700/50',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {collapsed ? (
            collapsedLogo || (
              <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs font-mono">MRP</span>
              </div>
            )
          ) : (
            logo || (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs font-mono">MRP</span>
                </div>
                <span className="text-lg font-bold font-mono flex items-end">MRP<span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-0.5 mb-1" /></span>
              </div>
            )
          )}

          {/* Collapse button */}
          {!collapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-thin">
          {items.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              onClick={onItemClick}
            />
          ))}
        </nav>

        {/* User section */}
        {user && (
          <div
            className={cn(
              'border-t border-slate-700/50 p-4',
              collapsed && 'flex justify-center'
            )}
          >
            <div
              className={cn(
                'flex items-center gap-3',
                collapsed && 'justify-center'
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.name}
                  </p>
                  {user.role && (
                    <p className="text-xs text-slate-400 truncate">{user.role}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expand button (when collapsed) */}
        {collapsed && onToggleCollapse && (
          <div className="p-4 border-t border-slate-700/50">
            <button
              onClick={onToggleCollapse}
              className="w-full p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors flex justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Footer */}
        {footer && !collapsed && (
          <div className="border-t border-slate-700/50 p-4">{footer}</div>
        )}
      </aside>
    </SidebarContext.Provider>
  );
};

Sidebar.displayName = 'Sidebar';

// =============================================================================
// DEFAULT NAVIGATION ITEMS
// =============================================================================

export const defaultNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    labelVi: 'Tổng quan',
    icon: <LayoutDashboard className="w-5 h-5" />,
    href: '/dashboard',
  },
  { id: 'divider-1', divider: true, label: '' },
  { id: 'section-main', section: 'Main Menu', label: '' },
  {
    id: 'inventory',
    label: 'Inventory',
    labelVi: 'Kho hàng',
    icon: <Package className="w-5 h-5" />,
    children: [
      { id: 'inventory-parts', label: 'Parts', labelVi: 'Linh kiện', href: '/inventory/parts' },
      { id: 'inventory-stock', label: 'Stock', labelVi: 'Tồn kho', href: '/inventory/stock' },
      { id: 'inventory-movements', label: 'Movements', labelVi: 'Xuất nhập', href: '/inventory/movements' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    labelVi: 'Bán hàng',
    icon: <ShoppingCart className="w-5 h-5" />,
    badge: '12',
    badgeColor: 'primary',
    children: [
      { id: 'sales-orders', label: 'Orders', labelVi: 'Đơn hàng', href: '/sales/orders' },
      { id: 'sales-customers', label: 'Customers', labelVi: 'Khách hàng', href: '/sales/customers' },
      { id: 'sales-products', label: 'Products', labelVi: 'Sản phẩm', href: '/sales/products' },
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    labelVi: 'Mua hàng',
    icon: <Truck className="w-5 h-5" />,
    children: [
      { id: 'procurement-po', label: 'Purchase Orders', labelVi: 'Đơn mua', href: '/procurement/po' },
      { id: 'procurement-suppliers', label: 'Suppliers', labelVi: 'Nhà cung cấp', href: '/procurement/suppliers' },
      { id: 'procurement-receiving', label: 'Receiving', labelVi: 'Nhận hàng', href: '/procurement/receiving' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    labelVi: 'Sản xuất',
    icon: <Factory className="w-5 h-5" />,
    children: [
      { id: 'production-wo', label: 'Work Orders', labelVi: 'Lệnh SX', href: '/production/wo' },
      { id: 'production-bom', label: 'BOM', labelVi: 'BOM', href: '/production/bom' },
      { id: 'production-routing', label: 'Routing', labelVi: 'Quy trình', href: '/production/routing' },
    ],
  },
  {
    id: 'quality',
    label: 'Quality',
    labelVi: 'Chất lượng',
    icon: <ClipboardCheck className="w-5 h-5" />,
    badge: '3',
    badgeColor: 'warning',
    children: [
      { id: 'quality-ncr', label: 'NCR', labelVi: 'NCR', href: '/quality/ncr' },
      { id: 'quality-capa', label: 'CAPA', labelVi: 'CAPA', href: '/quality/capa' },
      { id: 'quality-inspection', label: 'Inspection', labelVi: 'Kiểm tra', href: '/quality/inspection' },
    ],
  },
  { id: 'divider-2', divider: true, label: '' },
  {
    id: 'analytics',
    label: 'Analytics',
    labelVi: 'Phân tích',
    icon: <BarChart3 className="w-5 h-5" />,
    href: '/analytics',
  },
  {
    id: 'ai-copilot',
    label: 'AI Copilot',
    labelVi: 'AI Copilot',
    icon: <Bot className="w-5 h-5" />,
    href: '/ai',
    badge: 'NEW',
    badgeColor: 'success',
  },
  { id: 'divider-3', divider: true, label: '' },
  { id: 'section-system', section: 'System', label: '' },
  {
    id: 'users',
    label: 'Users',
    labelVi: 'Người dùng',
    icon: <Users className="w-5 h-5" />,
    href: '/users',
  },
  {
    id: 'settings',
    label: 'Settings',
    labelVi: 'Cài đặt',
    icon: <Settings className="w-5 h-5" />,
    href: '/settings',
  },
  {
    id: 'help',
    label: 'Help',
    labelVi: 'Trợ giúp',
    icon: <HelpCircle className="w-5 h-5" />,
    href: '/help',
  },
];

// =============================================================================
// EXPORTS
// =============================================================================

export { Sidebar, NavItemComponent };
export default Sidebar;
