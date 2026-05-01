// =============================================================================
// 🎨 MODERN APP SHELL
// Premium layout combining Mega Menu Header + Minimalist Sidebar
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { RTR_AUTH_CONFIG } from '@/lib/auth-gateway/types';
import { ModernHeader } from './modern-header';
import { MinimalistSidebar } from './minimalist-sidebar';
import { SidebarV2 } from './sidebar-v2';
import { MobileNav } from './mobile-nav';
import { PageTransition } from './page-transition';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useLanguage } from '@/lib/i18n/language-context';
import { FEATURE_FLAGS } from '@/lib/feature-flags';
import type { RoleCode } from '@/lib/auth/rbac';

// =============================================================================
// TYPES
// =============================================================================

export interface ModernAppShellProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    role?: string;
  };
  userRoles?: RoleCode[];
  userId?: string;
  notifications?: {
    id: string;
    title: string;
    read: boolean;
  }[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ModernAppShell({
  children,
  user = { name: 'Admin User', email: 'admin@rtr.vn', role: 'Administrator' },
  userRoles = [],
  userId,
  notifications = [],
}: ModernAppShellProps) {
  const useSidebarV2 = FEATURE_FLAGS.SIDEBAR_V2;
  const pathname = usePathname();
  
  // Use global language context (single source of truth)
  const { language, setLanguage } = useLanguage();

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load preferences from localStorage and sync dark mode
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    const savedDarkMode = localStorage.getItem('dark-mode');

    if (savedCollapsed) setSidebarCollapsed(savedCollapsed === 'true');

    // Initialize dark mode
    const isDark = savedDarkMode === 'true';
    setDarkMode(isDark);
    // Only use document.documentElement for dark class (single source of truth)
    document.documentElement.classList.toggle('dark', isDark);

    setMounted(true);
  }, []);

  // Save sidebar state
  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    localStorage.setItem('sidebar-collapsed', String(!sidebarCollapsed));
  };

  // Toggle dark mode
  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('dark-mode', String(!darkMode));
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  // Change language (context's setLanguage already saves to localStorage)
  const handleLanguageChange = (lang: 'en' | 'vi') => {
    setLanguage(lang);
  };

  // Handle logout via Auth Gateway
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-session');
      localStorage.removeItem('rtr-mrp-session');
      sessionStorage.clear();
    }
    const redirectUrl = encodeURIComponent(window.location.origin);
    window.location.href = `${RTR_AUTH_CONFIG.authUrl}/logout?redirect=${redirectUrl}`;
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Check if current page is mobile app (don't show shell)
  const isMobilePage = pathname.startsWith('/mobile');
  
  if (isMobilePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#08090a]">
      {/* Header */}
      <ModernHeader
        user={user}
        language={language}
        onLanguageChange={handleLanguageChange}
        darkMode={darkMode}
        onToggleDarkMode={handleDarkModeToggle}
        onLogout={handleLogout}
        onSidebarToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Header h-10 = 2.5rem */}
      <div className="flex h-[calc(100vh-2.5rem)]">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:block">
          {useSidebarV2 ? (
            <SidebarV2 user={{ id: userId || '', roles: userRoles }} />
          ) : (
            <MinimalistSidebar
              collapsed={sidebarCollapsed}
              onToggle={handleSidebarToggle}
              language={language}
              user={user}
            />
          )}
        </div>

        {/* Sidebar - Mobile Overlay */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed left-0 top-16 bottom-0 z-50 lg:hidden animate-in slide-in-from-left duration-300">
              <MinimalistSidebar
                collapsed={false}
                onToggle={() => setMobileMenuOpen(false)}
                language={language}
                user={user}
              />
            </div>
          </>
        )}

        {/* Main Content - COMPACT: p-6 → p-4 */}
        <main className="flex-1 overflow-y-auto">
          {/* Add bottom padding on mobile for fixed bottom nav (h-14 + safe area) */}
          <div className="p-3 pb-20 md:pb-3">
            {/* Breadcrumb navigation (hidden on home page) */}
            {pathname !== '/home' && pathname !== '/' && (
              <div className="mb-1">
                <Breadcrumb showHome maxItems={4} />
              </div>
            )}
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav language={language} />
    </div>
  );
}

export default ModernAppShell;
