'use client';

import { useRtrSession } from '@/lib/auth-gateway/client';
import { ModernAppShell } from '@/components/layout/modern-app-shell';
import AIWrapper from '@/components/ai-copilot/ai-wrapper';
import { WorkSessionPanel } from '@/components/work-session/work-session-panel';
import { ContextAssistantDialog } from '@/components/work-session/context-assistant-dialog';
import { CommandPalette } from '@/components/command-palette';

import { useFeatureAnnouncement } from '@/hooks/use-feature-announcement';

import type { RoleCode } from '@/lib/auth/rbac';

export interface DashboardLayoutClientProps {
  children: React.ReactNode;
  userRoles?: RoleCode[];
  userId?: string;
}

export function DashboardLayoutClient({ children, userRoles = [], userId }: DashboardLayoutClientProps) {
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
      userRoles={userRoles}
      userId={userId}
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
