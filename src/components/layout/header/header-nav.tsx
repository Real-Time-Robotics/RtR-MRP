// =============================================================================
// HEADER NAVIGATION - Mega Menu & Quick Create
// =============================================================================

'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { NavTab, MegaMenuItem } from './header-types';
import { navigationTabs, quickCreateItems } from './header-nav-data';

// =============================================================================
// MEGA MENU COMPONENT
// =============================================================================

interface MegaMenuProps {
  tab: NavTab;
  isOpen: boolean;
  onClose: () => void;
}

export function MegaMenu({ tab, isOpen, onClose }: MegaMenuProps) {
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

export function QuickCreateDropdown({ isOpen, onClose }: QuickCreateDropdownProps) {
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
// NAVIGATION TABS BAR
// =============================================================================

interface HeaderNavProps {
  activeTab: string | null;
  onTabChange: (tabId: string | null) => void;
}

export function HeaderNav({ activeTab, onTabChange }: HeaderNavProps) {
  const { t } = useLanguage();

  return (
    <nav className="hidden lg:flex items-center gap-0.5 ml-2">
      {navigationTabs.map((tab) => (
        <div key={tab.id} className="relative">
          <button
            onClick={() => onTabChange(activeTab === tab.id ? null : tab.id)}
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
            onClose={() => onTabChange(null)}
          />
        </div>
      ))}
    </nav>
  );
}

export { navigationTabs, quickCreateItems };
