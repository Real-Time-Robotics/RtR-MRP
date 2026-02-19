'use client';

import dynamic from 'next/dynamic';
import { AIProvider } from '@/lib/ai-context';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n/language-context';

// Lazy-load AI Copilot (~411 lines + ai-chat-panel 1011 lines + proactive-insights 519 lines + smart-action-executor 548 lines)
const AICopilot = dynamic(() => import('./ai-copilot'), {
  ssr: false,
  loading: () => null,
});

interface AIWrapperProps {
  children: React.ReactNode;
}

export default function AIWrapper({ children }: AIWrapperProps) {
  const { data: session } = useSession();
  const { language } = useLanguage();

  const user = session?.user ? {
    id: session.user.id || 'anonymous',
    name: session.user.name || 'User',
    role: session.user.role || 'user',
  } : {
    id: 'anonymous',
    name: 'User',
    role: 'user',
  };

  return (
    <AIProvider user={user} language={language as 'en' | 'vi'}>
      {children}
      <AICopilot
        user={user}
        language={language as 'en' | 'vi'}
      />
    </AIProvider>
  );
}
