'use client';

import React, { useState } from 'react';
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
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Navigation items
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

// Sidebar Component
const Sidebar: React.FC<{
  collapsed: boolean;
  onToggle: () => void;
}> = ({ collapsed, onToggle }) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-navy-900 text-white flex flex-col z-40 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Bloomberg-style Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-navy-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs font-mono">MRP</span>
            </div>
            <span className="font-bold text-lg font-mono flex items-end">MRP<span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-0.5 mb-1" /></span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xs font-mono">MRP</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-navy-800">
        {/* Settings Link */}
        <div className="p-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-navy-300 hover:bg-navy-800 hover:text-white',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Collapse Toggle - Sleek Bottom Bar */}
        <div className={cn(
          'flex items-center border-t border-navy-800',
          collapsed ? 'justify-center p-2' : 'justify-between px-4 py-3'
        )}>
          {!collapsed && (
            <span className="text-xs text-navy-500 font-medium">v2.0</span>
          )}
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center justify-center rounded-lg transition-all duration-200',
              'text-navy-400 hover:text-white hover:bg-navy-800',
              collapsed ? 'p-2' : 'p-1.5'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

// TopBar Component
const TopBar: React.FC<{
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}> = ({ sidebarCollapsed, onMenuClick, darkMode, onToggleDarkMode }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 flex items-center justify-between px-6 z-30 transition-all duration-300',
        'bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-700',
        sidebarCollapsed ? 'left-16' : 'left-64'
      )}
    >
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-slate-400 bg-slate-100 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Help */}
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg">
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2">
              <div className="px-4 py-2 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-slate-50">
                  <p className="text-sm text-slate-900">Low stock alert: Motor U15 II</p>
                  <p className="text-xs text-slate-500 mt-1">5 minutes ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50">
                  <p className="text-sm text-slate-900">Order SO-2024-0156 confirmed</p>
                  <p className="text-xs text-slate-500 mt-1">1 hour ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50">
                  <p className="text-sm text-slate-900">NCR-2024-0089 requires attention</p>
                  <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-slate-100">
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg"
          >
            <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold text-sm">
              NV
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-900">Nguyen Van A</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900">Nguyen Van A</p>
                <p className="text-xs text-slate-500">admin@rtr.vn</p>
              </div>
              <div className="py-1">
                <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
              <div className="border-t border-slate-100 py-1">
                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-600 hover:bg-slate-50">
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

// Main AppShell Component
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Apply dark mode class to html element
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Check for saved preference or system preference on mount
  React.useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
  };

  return (
    <div className={cn('min-h-screen transition-colors duration-300', darkMode ? 'bg-slate-900' : 'bg-slate-50')}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <TopBar
        sidebarCollapsed={sidebarCollapsed}
        onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        )}
      >
        {children}
      </main>
    </div>
  );
};

export default AppShell;
