'use client';

// =============================================================================
// APP PROVIDERS
// Combine all providers for easy setup
// =============================================================================

import React from 'react';
import { ToastProvider } from '@/components/ui/toast-v2';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { CommandPalette } from '@/components/ui/command-palette-v2';
import { AIAssistantWidgetV2 } from '@/components/ai/assistant-widget-v2';

interface AppProvidersProps {
  children: React.ReactNode;
  enableAI?: boolean;
  enableCommandPalette?: boolean;
}

export function AppProviders({ 
  children, 
  enableAI = true,
  enableCommandPalette = true,
}: AppProvidersProps) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        {children}
        {enableCommandPalette && <CommandPalette />}
        {enableAI && <AIAssistantWidgetV2 />}
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default AppProviders;
