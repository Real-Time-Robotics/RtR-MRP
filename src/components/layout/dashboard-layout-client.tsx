'use client';

import { ModernAppShell } from '@/components/layout/modern-app-shell';
import AIWrapper from '@/components/ai-copilot/ai-wrapper';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ModernAppShell
      user={{ name: 'Admin', email: 'admin@rtr.vn', role: 'Administrator' }}
      notifications={[]}
    >
      <AIWrapper>
        {children}
      </AIWrapper>
    </ModernAppShell>
  );
}
