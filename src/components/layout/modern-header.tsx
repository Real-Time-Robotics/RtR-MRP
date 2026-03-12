// =============================================================================
// MODERN HEADER WITH MEGA MENU
// Premium UI/UX - Linear/Notion/Figma inspired
// Refactored: sub-components extracted to ./header/
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigationHistory } from '@/hooks/use-navigation-history';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  Search,
  ChevronLeft,
  Moon,
  Sun,
  Plus,
  Globe,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScreenshotButton } from '@/components/ui/screenshot-button';

import { HeaderNav, QuickCreateDropdown } from './header/header-nav';
import { CommandPalette } from './header/header-search';
import { HeaderUserMenu } from './header/header-user-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';

// =============================================================================
// MAIN HEADER COMPONENT
// =============================================================================

export interface ModernHeaderProps {
  user?: { name: string; email: string; role?: string };
  language?: 'en' | 'vi';
  onLanguageChange?: (lang: 'en' | 'vi') => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogout?: () => void;
  onSidebarToggle?: () => void;
}

export function ModernHeader({
  user = { name: 'Admin User', email: 'admin@rtr.vn', role: 'Administrator' },
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
          <HeaderNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

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

            {/* Notifications - Full NotificationBell with search, filter, real-time */}
            <NotificationBell className="w-7 h-7" />

            {/* User Menu */}
            <HeaderUserMenu
              isOpen={showUserMenu}
              onToggle={() => setShowUserMenu(!showUserMenu)}
              onClose={() => setShowUserMenu(false)}
              user={user}
              darkMode={darkMode}
              onToggleDarkMode={onToggleDarkMode}
              onLogout={onLogout}
            />
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
