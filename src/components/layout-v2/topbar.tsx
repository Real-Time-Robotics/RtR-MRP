'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Settings,
  User,
  ChevronDown,
  LogOut,
  HelpCircle,
  Moon,
  Sun,
  Menu,
  Command,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TOP BAR COMPONENT
// Main navigation header with search, notifications, and user menu
// =============================================================================

export interface TopBarProps {
  /** User info */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
  /** Logo or brand */
  logo?: React.ReactNode;
  /** Show search bar */
  showSearch?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search handler */
  onSearch?: (query: string) => void;
  /** Command palette trigger */
  onCommandPalette?: () => void;
  /** Notifications */
  notifications?: {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type?: 'info' | 'success' | 'warning' | 'error';
  }[];
  /** Notification click handler */
  onNotificationClick?: (id: string) => void;
  /** Mark all as read handler */
  onMarkAllRead?: () => void;
  /** Dark mode state */
  darkMode?: boolean;
  /** Dark mode toggle handler */
  onDarkModeToggle?: () => void;
  /** Sidebar toggle handler (mobile) */
  onSidebarToggle?: () => void;
  /** User menu items */
  userMenuItems?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
  }[];
  /** Logout handler */
  onLogout?: () => void;
  /** Custom className */
  className?: string;
}

// Notification dropdown
const NotificationDropdown: React.FC<{
  notifications: TopBarProps['notifications'];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClose: () => void;
}> = ({ notifications = [], onNotificationClick, onMarkAllRead, onClose }) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'success': return 'bg-success-500';
      case 'warning': return 'bg-warning-500';
      case 'error': return 'bg-danger-500';
      default: return 'bg-info-500';
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-dropdown animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">Notifications</h3>
        {unreadCount > 0 && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="max-h-96 overflow-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => onNotificationClick?.(notification.id)}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors',
                'border-b border-slate-100 last:border-b-0',
                !notification.read && 'bg-primary-50/50'
              )}
            >
              <div className="flex gap-3">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                    getTypeColor(notification.type)
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm text-slate-900 truncate',
                    !notification.read && 'font-medium'
                  )}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
};

// User menu dropdown
const UserMenuDropdown: React.FC<{
  user?: TopBarProps['user'];
  menuItems?: TopBarProps['userMenuItems'];
  onLogout?: () => void;
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
  onClose: () => void;
}> = ({ user, menuItems = [], onLogout, darkMode, onDarkModeToggle, onClose }) => {
  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-dropdown animate-fade-in">
      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="font-medium text-slate-900">{user.name}</p>
          {user.email && (
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
          )}
          {user.role && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              {user.role}
            </span>
          )}
        </div>
      )}

      {/* Menu items */}
      <div className="py-1">
        {/* Dark mode toggle */}
        {onDarkModeToggle && (
          <button
            onClick={onDarkModeToggle}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
            <div
              className={cn(
                'w-8 h-5 rounded-full transition-colors relative',
                darkMode ? 'bg-primary-600' : 'bg-slate-200'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  darkMode ? 'left-3.5' : 'left-0.5'
                )}
              />
            </div>
          </button>
        )}

        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={cn(
              'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors',
              item.danger
                ? 'text-danger-600 hover:bg-danger-50'
                : 'text-slate-700 hover:bg-slate-50'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        {/* Default menu items */}
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <HelpCircle className="h-4 w-4" />
          Help & Support
        </button>

        {/* Logout */}
        {onLogout && (
          <>
            <div className="my-1 border-t border-slate-100" />
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Main TopBar component
const TopBar: React.FC<TopBarProps> = ({
  user,
  logo,
  showSearch = true,
  searchPlaceholder = 'Search...',
  onSearch,
  onCommandPalette,
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  darkMode = false,
  onDarkModeToggle,
  onSidebarToggle,
  userMenuItems,
  onLogout,
  className,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header
      className={cn(
        'h-16 bg-white border-b border-slate-200',
        'flex items-center justify-between px-4 lg:px-6',
        'sticky top-0 z-sticky',
        className
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Logo */}
        {logo}

        {/* Search */}
        {showSearch && (
          <form onSubmit={handleSearch} className="hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-64 lg:w-80 pl-10 pr-20 py-2 text-sm bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
              {onCommandPalette && (
                <button
                  type="button"
                  onClick={onCommandPalette}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-400 bg-white border border-slate-200 rounded"
                >
                  <Command className="h-3 w-3" />K
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Mobile search toggle */}
        {showSearch && (
          <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Search className="h-5 w-5" />
          </button>
        )}

        {/* Notifications */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown
              notifications={notifications}
              onNotificationClick={onNotificationClick}
              onMarkAllRead={onMarkAllRead}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>

        {/* User menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {/* Avatar */}
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            
            {/* Name (desktop) */}
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-slate-900">
                {user?.name || 'User'}
              </p>
            </div>
            
            <ChevronDown className="hidden lg:block h-4 w-4 text-slate-400" />
          </button>

          {showUserMenu && (
            <UserMenuDropdown
              user={user}
              menuItems={userMenuItems}
              onLogout={onLogout}
              darkMode={darkMode}
              onDarkModeToggle={onDarkModeToggle}
              onClose={() => setShowUserMenu(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
};

TopBar.displayName = 'TopBar';

// =============================================================================
// EXPORTS
// =============================================================================

export { TopBar };
export default TopBar;
