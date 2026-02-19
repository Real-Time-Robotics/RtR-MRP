// =============================================================================
// MOBILE EMPTY STATE
// =============================================================================

'use client';

import React, { ReactNode } from 'react';
import { MobileButton } from './mobile-button';

interface MobileEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function MobileEmptyState({ icon, title, description, action }: MobileEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs">{description}</p>
      )}
      {action && (
        <MobileButton variant="primary" size="md" onClick={action.onClick} className="mt-4">
          {action.label}
        </MobileButton>
      )}
    </div>
  );
}
