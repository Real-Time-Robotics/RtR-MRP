// =============================================================================
// HEADER USER MENU - User Dropdown
// =============================================================================

'use client';

import React from 'react';
import Link from 'next/link';
import {
  Settings,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

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

export function UserDropdown({ isOpen, onClose, user, darkMode, onToggleDarkMode, onLogout }: UserDropdownProps) {
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
// USER MENU BUTTON (trigger + dropdown)
// =============================================================================

interface HeaderUserMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  user: { name: string; email: string; role?: string };
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export function HeaderUserMenu({
  isOpen,
  onToggle,
  onClose,
  user,
  darkMode,
  onToggleDarkMode,
  onLogout,
}: HeaderUserMenuProps) {
  return (
    <div className="relative ml-0.5">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gunmetal transition-all"
      >
        <div className="w-6 h-6 border border-gray-300 dark:border-mrp-border flex items-center justify-center text-gray-500 dark:text-mrp-text-muted font-mono text-[10px] bg-gray-100 dark:bg-transparent">
          {user.name.charAt(0)}
        </div>
        <ChevronDown className="w-3 h-3 text-gray-500 dark:text-mrp-text-muted hidden sm:block" />
      </button>
      <UserDropdown
        isOpen={isOpen}
        onClose={onClose}
        user={user}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onLogout={onLogout}
      />
    </div>
  );
}
