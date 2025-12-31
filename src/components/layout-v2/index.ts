// =============================================================================
// RTR MRP - LAYOUT COMPONENTS INDEX
// Export all layout components for easy importing
// =============================================================================

// Sidebar
export { Sidebar, NavItemComponent, defaultNavItems } from './sidebar';
export type { SidebarProps, NavItem } from './sidebar';

// TopBar
export { TopBar } from './topbar';
export type { TopBarProps } from './topbar';

// Page Layout
export {
  PageLayout,
  PageContainer,
  PageHeader,
  PageSection,
  Grid,
  SplitLayout,
} from './page-layout';
export type {
  PageLayoutProps,
  PageContainerProps,
  PageHeaderProps,
  PageSectionProps,
  GridProps,
  SplitLayoutProps,
} from './page-layout';

// AppShell (Combined Sidebar + TopBar)
export { AppShell } from './app-shell';
