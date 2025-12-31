// =============================================================================
// RTR MRP - APP SHELL (v2)
// Main layout with dark mode support and animations
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Factory,
  ShieldCheck,
  BarChart3,
  Layers,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  User,
  Menu,
  Moon,
  Sun,
  LogOut,
  HelpCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, ThemeToggle } from '@/components/providers/theme-provider';
import { PageTransition } from '@/components/ui/animations';

// =============================================================================
// NAVIGATION ITEMS
// =============================================================================

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/v2/dashboard' },
  { id: 'inventory', label: 'Inventory', icon: Package, href: '/v2/inventory' },
  { id: 'parts', label: 'Parts Master', icon: Boxes, href: '/v2/parts' },
  { id: 'sales', label: 'Sales Orders', icon: ShoppingCart, href: '/v2/sales' },
  { id: 'production', label: 'Production', icon: Factory, href: '/v2/production' },
  { id: 'quality', label: 'Quality', icon: ShieldCheck, href: '/v2/quality' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/v2/analytics' },
  { id: 'bom', label: 'BOM', icon: Layers, href: '/v2/bom' },
];

const bottomNavItems = [
  { id: 'settings', label: 'Settings', icon: Settings, href: '/v2/settings' },
];

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose
}) => {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen z-50',
          'bg-neutral-900 dark:bg-neutral-950 text-white',
          'flex flex-col transition-all duration-300 ease-smooth',
          // Desktop
          collapsed ? 'w-16' : 'w-64',
          // Mobile
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          {!collapsed && (
            <div className="flex items-center gap-3 animate-fade-in">
              {/* Bloomberg-style Logo */}
              <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center font-bold text-white font-mono text-xs">
                MRP
              </div>
              <span className="font-bold text-lg font-mono text-white tracking-tight flex items-end">
                MRP<span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-0.5 mb-1" />
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center font-bold text-white mx-auto font-mono text-xs">
              MRP
            </div>
          )}
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <li
                  key={item.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      'hover:scale-[1.02] active:scale-[0.98]',
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className={cn(
                      'h-5 w-5 flex-shrink-0 transition-transform duration-200',
                      'group-hover:scale-110'
                    )} />
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                    {isActive && collapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-gray-800 py-4 px-2">
          <ul className="space-y-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Collapse Toggle - Desktop only */}
          <button
            onClick={onToggle}
            className="hidden lg:flex w-full mt-4 items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 transition-transform duration-200 hover:translate-x-0.5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 transition-transform duration-200 hover:-translate-x-0.5" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

// =============================================================================
// TOPBAR COMPONENT
// =============================================================================

interface TopBarProps {
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ sidebarCollapsed, onMenuClick }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isDark } = useTheme();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
      setShowNotifications(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 z-30',
        'bg-white dark:bg-neutral-900',
        'border-b border-gray-200 dark:border-neutral-800',
        'flex items-center justify-between px-4 lg:px-6',
        'transition-all duration-300',
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-64',
        'left-0'
      )}
    >
      {/* Left Side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className={cn(
              'w-64 pl-10 pr-12 py-2 text-sm rounded-lg',
              'bg-gray-50 dark:bg-neutral-800',
              'border border-gray-200 dark:border-neutral-700',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-neutral-500',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'transition-all duration-200'
            )}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-neutral-700 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme Toggle */}
        <ThemeToggle size="sm" />

        {/* Help */}
        <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 active:scale-95">
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 active:scale-95"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-200 dark:border-neutral-700 py-2 animate-fade-in-down">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-neutral-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {[
                  { text: 'Low stock alert: Motor U15 II', time: '5 minutes ago' },
                  { text: 'Order SO-2024-0156 confirmed', time: '1 hour ago' },
                  { text: 'NCR-2024-0089 requires attention', time: '2 hours ago' },
                ].map((notif, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                  >
                    <p className="text-sm text-gray-900 dark:text-white">{notif.text}</p>
                    <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">{notif.time}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100 dark:border-neutral-700">
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 active:scale-95"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold text-sm text-white">
              NV
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Nguyen Van A</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Administrator</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-200 dark:border-neutral-700 py-2 animate-fade-in-down">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Nguyen Van A</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">admin@rtr.vn</p>
              </div>
              <div className="py-1">
                <Link
                  href="/v2/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/v2/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
              <div className="border-t border-gray-100 dark:border-neutral-700 py-1">
                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// =============================================================================
// MAIN APP SHELL COMPONENT
// =============================================================================

interface AppShellV2Props {
  children: React.ReactNode;
}

export const AppShellV2: React.FC<AppShellV2Props> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  const pathname = usePathname();
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 transition-colors duration-300">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64',
          'pl-0'
        )}
      >
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
};

export default AppShellV2;
