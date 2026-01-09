'use client';

import { ModernAppShell } from '@/components/layout/modern-app-shell';
import AIWrapper from '@/components/ai-copilot/ai-wrapper';
import { DemoFloatingBadge } from '@/components/demo/demo-floating-badge';

import { useFeatureAnnouncement } from '@/hooks/use-feature-announcement';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  useFeatureAnnouncement();

  return (
    <ModernAppShell
      user={{ name: 'Admin', email: 'admin@rtr.vn', role: 'Administrator' }}
      notifications={[]}
    >
      <AIWrapper>
        {children}
      </AIWrapper>
      {/* Demo Mode Badge - only visible for demo users */}
      <DemoFloatingBadge position="bottom-left" />
    </ModernAppShell>
  );
}
