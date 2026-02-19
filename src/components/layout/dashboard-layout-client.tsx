'use client';

import { useSession } from 'next-auth/react';
import { ModernAppShell } from '@/components/layout/modern-app-shell';
import AIWrapper from '@/components/ai-copilot/ai-wrapper';
import { DemoFloatingBadge } from '@/components/demo/demo-floating-badge';

import { useFeatureAnnouncement } from '@/hooks/use-feature-announcement';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  useFeatureAnnouncement();
  const { data: session } = useSession();

  const user = session?.user
    ? {
        name: session.user.name || 'User',
        email: session.user.email || '',
        role: (session.user as { role?: string }).role || 'user',
      }
    : undefined;

  return (
    <ModernAppShell
      user={user}
    >
      <AIWrapper>
        {children}
      </AIWrapper>
      {/* Demo Mode Badge - only visible for demo users */}
      <DemoFloatingBadge position="bottom-left" />
    </ModernAppShell>
  );
}
