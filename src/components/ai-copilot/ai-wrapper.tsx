'use client';

import { AIProvider } from '@/lib/ai-context';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/lib/i18n/language-context';
import AICopilot from './ai-copilot';

interface AIWrapperProps {
  children: React.ReactNode;
}

export default function AIWrapper({ children }: AIWrapperProps) {
  const { data: session } = useSession();
  const { language } = useLanguage();

  const user = session?.user ? {
    id: (session.user as any).id || 'anonymous',
    name: session.user.name || 'User',
    role: (session.user as any).role || 'user',
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
