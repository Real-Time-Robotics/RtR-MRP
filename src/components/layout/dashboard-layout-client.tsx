'use client';

import { useRtrSession } from '@/lib/auth-gateway/client';
import { ModernAppShell } from '@/components/layout/modern-app-shell';
import AIWrapper from '@/components/ai-copilot/ai-wrapper';
import { WorkSessionPanel } from '@/components/work-session/work-session-panel';
import { ContextAssistantDialog } from '@/components/work-session/context-assistant-dialog';
import { CommandPalette } from '@/components/command-palette';

import { useFeatureAnnouncement } from '@/hooks/use-feature-announcement';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  useFeatureAnnouncement();
  const { data: session } = useRtrSession();

  const user = session?.user
    ? {
        name: session.user.name || 'User',
        email: session.user.email || '',
        role: session.user.role || 'user',
      }
    : undefined;

  return (
    <ModernAppShell
      user={user}
    >
      <AIWrapper>
        {children}
      </AIWrapper>
      {/* Work Session Panel - floating bottom-right */}
      <WorkSessionPanel />
      {/* AI Context Assistant - Cmd+J */}
      <ContextAssistantDialog />
      {/* Command Palette - Cmd+K */}
      <CommandPalette />
    </ModernAppShell>
  );
}
