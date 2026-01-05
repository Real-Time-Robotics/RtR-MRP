// =============================================================================
// 🎨 MODERN APP SHELL
// Premium layout combining Mega Menu Header + Minimalist Sidebar
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ModernHeader } from './modern-header';
import { MinimalistSidebar } from './minimalist-sidebar';

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
  notifications = [],
}: ModernAppShellProps) {
  const pathname = usePathname();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'vi'>('vi');
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load preferences from localStorage and sync dark mode
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    const savedLanguage = localStorage.getItem('language') as 'en' | 'vi';
    const savedDarkMode = localStorage.getItem('dark-mode');

    if (savedCollapsed) setSidebarCollapsed(savedCollapsed === 'true');
    if (savedLanguage) setLanguage(savedLanguage);

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

  // Change language
  const handleLanguageChange = (lang: 'en' | 'vi') => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  // Handle logout
  const handleLogout = () => {
    // Implement logout logic
    console.log('Logout');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <ModernHeader
        user={user}
        notifications={notifications}
        language={language}
        onLanguageChange={handleLanguageChange}
        darkMode={darkMode}
        onToggleDarkMode={handleDarkModeToggle}
        onLogout={handleLogout}
        onSidebarToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:block">
          <MinimalistSidebar
            collapsed={sidebarCollapsed}
            onToggle={handleSidebarToggle}
            language={language}
            user={user}
          />
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

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ModernAppShell;
