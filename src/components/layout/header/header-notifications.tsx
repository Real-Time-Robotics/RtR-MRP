// =============================================================================
// HEADER NOTIFICATIONS - Notification Dropdown
// =============================================================================

'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';

// =============================================================================
// NOTIFICATION DROPDOWN
// =============================================================================

interface HeaderNotificationsProps {
  isOpen: boolean;
  onToggle: () => void;
  notifications: { id: string; title: string; read: boolean }[];
  unreadCount: number;
}

export function HeaderNotifications({ isOpen, onToggle, notifications, unreadCount }: HeaderNotificationsProps) {
  const { t } = useLanguage();

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative flex items-center justify-center w-7 h-7 text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal hover:text-info-cyan transition-all"
      >
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 bg-urgent-red text-white text-[9px] font-bold font-mono flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gunmetal rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('header.notifications')}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {unreadCount} {t('header.unread')}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('header.noNotifications')}
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {notification.title}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gunmetal/50">
            <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline w-full text-center">
              {t('header.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
