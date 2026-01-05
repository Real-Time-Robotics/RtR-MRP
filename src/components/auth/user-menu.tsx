'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleLabel, getRoleColor, type UserRole } from '@/lib/auth/auth-types';

// =============================================================================
// USER MENU
// Dropdown menu showing user info and actions
// =============================================================================

interface UserMenuProps {
  className?: string;
  compact?: boolean;
}

export function UserMenu({ className, compact = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  // Map NextAuth session to user object
  const sessionUser = session?.user as { name?: string | null; email?: string | null; image?: string | null; role?: string; department?: string } | undefined;
  const user = sessionUser ? {
    name: sessionUser.name || 'User',
    email: sessionUser.email || '',
    avatar: sessionUser.image || undefined,
    role: (sessionUser.role || 'viewer') as UserRole,
    department: sessionUser.department,
    lastLogin: undefined as Date | undefined,
  } : null;

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);

    // Clear any local storage data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-session');
      localStorage.removeItem('user-preferences');
      sessionStorage.clear();
    }

    // Sign out using NextAuth
    await signOut({ callbackUrl: '/login', redirect: false });

    // Force redirect to login
    window.location.href = '/login';
  };

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 transition-all rounded-xl',
          compact
            ? 'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800'
            : 'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800'
        )}
      >
        {/* Avatar */}
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
            {initials}
          </div>
        )}

        {!compact && (
          <>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 line-clamp-1">
                {user.email}
              </p>
            </div>
            <ChevronDown className={cn(
              'w-4 h-4 text-gray-400 transition-transform hidden sm:block',
              isOpen && 'rotate-180'
            )} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className="px-4 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-medium">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full',
                getRoleColor(user.role)
              )}>
                <Shield className="w-3 h-3 inline mr-1" />
                {getRoleLabel(user.role)}
              </span>
              {user.department && (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                  {user.department}
                </span>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <User className="w-5 h-5 text-gray-400" />
              <span>Hồ sơ cá nhân</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              <span>Cài đặt</span>
            </Link>

            <Link
              href="/change-password"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <KeyRound className="w-5 h-5 text-gray-400" />
              <span>Đổi mật khẩu</span>
            </Link>

            {/* Admin/Manager only */}
            {(isAdmin || isManager) && (
              <>
                <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                <Link
                  href="/users"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Shield className="w-5 h-5 text-gray-400" />
                  <span>Quản lý người dùng</span>
                </Link>
              </>
            )}

            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

            <Link
              href="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-gray-400" />
              <span>Trợ giúp</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="py-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Đăng xuất</span>
            </button>
          </div>

          {/* Last Login */}
          {user.lastLogin && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500">
                Đăng nhập lần cuối: {new Date(user.lastLogin).toLocaleString('vi-VN')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT USER AVATAR (for minimal display)
// =============================================================================

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showRole?: boolean;
  className?: string;
}

export function UserAvatar({
  size = 'md',
  showName = false,
  showRole = false,
  className,
}: UserAvatarProps) {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const sessionUser = session.user as { name?: string | null; image?: string | null; role?: string };
  const user = {
    name: sessionUser.name || 'User',
    avatar: sessionUser.image || undefined,
    role: (sessionUser.role || 'viewer') as UserRole,
  };

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className={cn('rounded-full object-cover', sizeClasses[size])}
        />
      ) : (
        <div className={cn(
          'rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium',
          sizeClasses[size]
        )}>
          {initials}
        </div>
      )}
      {(showName || showRole) && (
        <div>
          {showName && (
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user.name}
            </p>
          )}
          {showRole && (
            <p className="text-xs text-gray-500">
              {getRoleLabel(user.role)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AUTH STATUS INDICATOR (for debugging)
// =============================================================================

export function AuthStatusIndicator() {
  const { data: session, status } = useSession();

  const statusColors = {
    loading: 'bg-yellow-500',
    authenticated: 'bg-green-500',
    unauthenticated: 'bg-red-500',
  };

  const sessionUser = session?.user as { email?: string | null; role?: string } | undefined;
  const user = sessionUser ? {
    role: (sessionUser.role || 'viewer') as UserRole,
    email: sessionUser.email || '',
  } : null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
      <span className={cn('w-2 h-2 rounded-full', statusColors[status])} />
      <span className="font-mono">{status}</span>
      {user && (
        <span className="text-gray-400">
          | {user.role} | {user.email}
        </span>
      )}
    </div>
  );
}

export default UserMenu;
