'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// PAGE LAYOUT COMPONENT
// Main application layout with sidebar, topbar, and content area
// =============================================================================

export interface PageLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  topbar?: React.ReactNode;
  /** Sidebar collapsed state */
  sidebarCollapsed?: boolean;
  /** Sidebar toggle handler */
  onSidebarToggle?: () => void;
  /** Fixed sidebar (doesn't scroll with content) */
  fixedSidebar?: boolean;
  /** Fixed topbar (doesn't scroll with content) */
  fixedTopbar?: boolean;
  /** Custom className for main content */
  contentClassName?: string;
  /** Page background */
  background?: 'white' | 'gray' | 'transparent';
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  sidebar,
  topbar,
  sidebarCollapsed = false,
  onSidebarToggle,
  fixedSidebar = true,
  fixedTopbar = true,
  contentClassName,
  background = 'gray',
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [children]);

  const backgrounds = {
    white: 'bg-white',
    gray: 'bg-slate-50',
    transparent: 'bg-transparent',
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-overlay lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex-shrink-0 bg-navy-900 transition-all duration-300',
          // Width
          sidebarCollapsed ? 'w-16' : 'w-60',
          // Position
          fixedSidebar && 'fixed left-0 top-0 bottom-0 z-sticky',
          // Mobile
          isMobile && 'fixed left-0 top-0 bottom-0 z-modal',
          isMobile && !mobileMenuOpen && '-translate-x-full',
          isMobile && mobileMenuOpen && 'translate-x-0'
        )}
      >
        {sidebar}
      </aside>

      {/* Main content wrapper */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0',
          // Margin for fixed sidebar
          fixedSidebar && !isMobile && (sidebarCollapsed ? 'ml-16' : 'ml-60'),
          'transition-all duration-300'
        )}
      >
        {/* Topbar */}
        {topbar && (
          <div
            className={cn(
              fixedTopbar && 'sticky top-0 z-sticky'
            )}
          >
            {topbar}
          </div>
        )}

        {/* Main content */}
        <main
          className={cn(
            'flex-1',
            backgrounds[background],
            contentClassName
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

PageLayout.displayName = 'PageLayout';

// =============================================================================
// PAGE CONTAINER
// Standard content container with max-width and padding
// =============================================================================

export interface PageContainerProps {
  children: React.ReactNode;
  /** Max width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
}

const maxWidths = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = '2xl',
  padding = 'md',
  className,
}) => {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidths[maxWidth],
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

PageContainer.displayName = 'PageContainer';

// =============================================================================
// PAGE HEADER
// Standard page header with title, description, and actions
// =============================================================================

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Page description/subtitle */
  description?: string;
  /** Breadcrumb items */
  breadcrumbs?: { label: string; href?: string }[];
  /** Action buttons */
  actions?: React.ReactNode;
  /** Back button handler */
  onBack?: () => void;
  /** Custom className */
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  onBack,
  className,
}) => {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2">
          <ol className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-slate-400">/</span>
                )}
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-slate-700 font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Title and actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="mb-2 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          
          {/* Description */}
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

PageHeader.displayName = 'PageHeader';

// =============================================================================
// PAGE SECTION
// Section within a page with optional title
// =============================================================================

export interface PageSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

const PageSection: React.FC<PageSectionProps> = ({
  children,
  title,
  description,
  actions,
  className,
}) => {
  return (
    <section className={cn('mb-8', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

PageSection.displayName = 'PageSection';

// =============================================================================
// GRID LAYOUTS
// Responsive grid layouts for common patterns
// =============================================================================

export interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

const gridGaps = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

const Grid: React.FC<GridProps> = ({
  children,
  cols = 4,
  gap = 'md',
  className,
}) => {
  return (
    <div className={cn('grid', gridCols[cols], gridGaps[gap], className)}>
      {children}
    </div>
  );
};

Grid.displayName = 'Grid';

// =============================================================================
// SPLIT LAYOUT
// Two-column layout with main and aside
// =============================================================================

export interface SplitLayoutProps {
  children: React.ReactNode;
  aside: React.ReactNode;
  /** Aside position */
  asidePosition?: 'left' | 'right';
  /** Aside width */
  asideWidth?: 'sm' | 'md' | 'lg';
  /** Stack on mobile */
  stackOnMobile?: boolean;
  className?: string;
}

const asideWidths = {
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96',
};

const SplitLayout: React.FC<SplitLayoutProps> = ({
  children,
  aside,
  asidePosition = 'right',
  asideWidth = 'md',
  stackOnMobile = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex gap-6',
        stackOnMobile && 'flex-col lg:flex-row',
        asidePosition === 'left' && 'lg:flex-row-reverse',
        className
      )}
    >
      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Aside */}
      <div
        className={cn(
          'flex-shrink-0',
          stackOnMobile ? 'w-full lg:' + asideWidths[asideWidth] : asideWidths[asideWidth]
        )}
      >
        {aside}
      </div>
    </div>
  );
};

SplitLayout.displayName = 'SplitLayout';

// =============================================================================
// EXPORTS
// =============================================================================

export {
  PageLayout,
  PageContainer,
  PageHeader,
  PageSection,
  Grid,
  SplitLayout,
};
export default PageLayout;
