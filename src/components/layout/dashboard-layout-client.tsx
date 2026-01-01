'use client';

import { SidebarProvider, useSidebar } from '@/lib/sidebar-context';
import { ProcessFlowSidebar } from '@/components/layout/process-flow-sidebar';
import { Header } from '@/components/layout/header';
import AIWrapper from '@/components/ai-copilot/ai-wrapper';
import { cn } from '@/lib/utils';

function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out',
        isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
      )}
    >
      {/* Header - sticky at top */}
      <div className="sticky top-0 z-30">
        <Header />
      </div>

      {/* Main content area */}
      <main className="p-4 md:p-6">
        <AIWrapper>
          {children}
        </AIWrapper>
      </main>
    </div>
  );
}

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        {/* Sidebar - fixed position */}
        <ProcessFlowSidebar />

        {/* Main content wrapper */}
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
