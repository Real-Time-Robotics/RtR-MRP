// =============================================================================
// RTR MRP - LAYOUT COMPONENTS INDEX
// Export all layout components for easy importing
// =============================================================================

// =============================================================================
// SIDEBAR CHÍNH: ProcessFlowSidebar
// Import từ: @/components/layout/process-flow-sidebar
// File này KHÔNG export sidebar - sử dụng ProcessFlowSidebar thay thế
// =============================================================================

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
