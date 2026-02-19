'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Factory,
  MoreHorizontal,
  Calculator,
  ClipboardCheck,
  Layers,
  Building2,
  Smartphone,
  AlertTriangle,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface NavItem {
  id: string;
  label: string;
  labelVi: string;
  icon: React.ReactNode;
  href: string;
  badge?: string | number;
}

// =============================================================================
// NAVIGATION ITEMS - Matching sidebar
// =============================================================================

const PRIMARY_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Home', labelVi: 'Trang chủ', icon: <LayoutDashboard className="w-5 h-5" />, href: '/home' },
  { id: 'orders', label: 'Orders', labelVi: 'Đơn hàng', icon: <ShoppingCart className="w-5 h-5" />, href: '/orders' },
  { id: 'inventory', label: 'Inventory', labelVi: 'Tồn kho', icon: <Package className="w-5 h-5" />, href: '/inventory' },
  { id: 'production', label: 'Production', labelVi: 'Sản xuất', icon: <Factory className="w-5 h-5" />, href: '/production' },
];

const MORE_ITEMS: NavItem[] = [
  { id: 'mrp', label: 'MRP', labelVi: 'MRP', icon: <Calculator className="w-5 h-5" />, href: '/mrp' },
  { id: 'quality', label: 'Quality', labelVi: 'Chất lượng', icon: <ClipboardCheck className="w-5 h-5" />, href: '/quality' },
  { id: 'parts', label: 'Parts', labelVi: 'Vật tư', icon: <Package className="w-5 h-5" />, href: '/parts' },
  { id: 'bom', label: 'BOM', labelVi: 'BOM', icon: <Layers className="w-5 h-5" />, href: '/bom' },
  { id: 'suppliers', label: 'Suppliers', labelVi: 'NCC', icon: <Building2 className="w-5 h-5" />, href: '/suppliers' },
  { id: 'mobile', label: 'Mobile App', labelVi: 'Mobile', icon: <Smartphone className="w-5 h-5" />, href: '/mobile' },
  { id: 'alerts', label: 'Alerts', labelVi: 'Cảnh báo', icon: <AlertTriangle className="w-5 h-5" />, href: '/alerts' },
  { id: 'ai', label: 'AI Insights', labelVi: 'AI Insights', icon: <Sparkles className="w-5 h-5" />, href: '/ai/insights' },
  { id: 'settings', label: 'Settings', labelVi: 'Cài đặt', icon: <Settings className="w-5 h-5" />, href: '/settings' },
];

// =============================================================================
// NAV ITEM BUTTON
// =============================================================================

function NavButton({
  item,
  isActive,
  language,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  language: 'en' | 'vi';
  onClick?: () => void;
}) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[56px]',
        'transition-colors duration-200',
        isActive
          ? 'text-info-cyan'
          : 'text-gray-500 dark:text-mrp-text-muted'
      )}
    >
      <span className={cn(
        'transition-transform duration-200',
        isActive && 'scale-110'
      )}>
        {item.icon}
      </span>
      <span className={cn(
        'text-[10px] font-medium truncate max-w-[60px]',
        isActive ? 'text-info-cyan' : 'text-gray-600 dark:text-mrp-text-secondary'
      )}>
        {language === 'vi' ? item.labelVi : item.label}
      </span>
      {item.badge && (
        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold bg-info-cyan text-white rounded-full">
          {item.badge}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="relative flex-1 flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className="relative flex-1 flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
    >
      {content}
    </Link>
  );
}

// =============================================================================
// MORE MENU DRAWER
// =============================================================================

function MoreDrawer({
  isOpen,
  onClose,
  language,
  isActive,
}: {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'vi';
  isActive: (href: string) => boolean;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white dark:bg-steel-dark rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-mrp-border">
            <span className="text-sm font-semibold text-gray-900 dark:text-mrp-text-primary">
              {language === 'vi' ? 'Menu khác' : 'More Options'}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gunmetal transition-colors touch-manipulation"
              aria-label="Đóng"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-mrp-text-muted" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="overflow-y-auto p-2 pb-safe">
            <div className="grid grid-cols-4 gap-1">
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 p-3 rounded-lg',
                    'transition-colors touch-manipulation active:scale-95',
                    isActive(item.href)
                      ? 'bg-info-cyan/10 text-info-cyan'
                      : 'text-gray-600 dark:text-mrp-text-secondary hover:bg-gray-100 dark:hover:bg-gunmetal'
                  )}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {language === 'vi' ? item.labelVi : item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// MAIN MOBILE NAV COMPONENT
// =============================================================================

export interface MobileNavProps {
  language?: 'en' | 'vi';
}

export function MobileNav({ language = 'vi' }: MobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/dashboard' || pathname.startsWith('/home/');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Check if any MORE_ITEMS is active
  const isMoreActive = MORE_ITEMS.some((item) => isActive(item.href));

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-30',
          'bg-white dark:bg-steel-dark',
          'border-t border-gray-200 dark:border-mrp-border',
          'pb-safe',
          // Hide on desktop (md breakpoint and above)
          'md:hidden'
        )}
      >
        <div className="flex items-stretch h-14">
          {/* Primary nav items */}
          {PRIMARY_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={isActive(item.href)}
              language={language}
            />
          ))}

          {/* More button */}
          <NavButton
            item={{
              id: 'more',
              label: 'More',
              labelVi: 'Thêm',
              icon: <MoreHorizontal className="w-5 h-5" />,
              href: '#',
            }}
            isActive={isMoreActive || moreOpen}
            language={language}
            onClick={() => setMoreOpen(true)}
          />
        </div>
      </nav>

      {/* More Drawer */}
      <MoreDrawer
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        language={language}
        isActive={isActive}
      />
    </>
  );
}

export default MobileNav;
