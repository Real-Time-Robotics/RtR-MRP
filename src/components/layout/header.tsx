"use client";

import { GlobalSearch } from "@/components/search/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AlertBell } from "@/components/alerts/alert-bell";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/providers/theme-provider";

export function Header() {
  return (
    <header className="h-16 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 flex items-center justify-between">
      {/* Global Search */}
      <GlobalSearch />

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Toggle */}
        <ThemeToggle size="sm" />

        {/* Manufacturing Alerts */}
        <AlertBell />

        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  );
}
