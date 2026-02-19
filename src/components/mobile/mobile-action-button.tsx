// =============================================================================
// MOBILE ACTION BUTTON (FAB)
// =============================================================================

'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MOBILE_TOKENS, haptic } from './mobile-tokens';

interface MobileActionButtonProps {
  icon: ReactNode;
  onClick: () => void;
  label?: string;
  variant?: 'primary' | 'secondary';
}

export function MobileActionButton({
  icon,
  onClick,
  label,
  variant = 'primary',
}: MobileActionButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
    secondary: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg border border-gray-200',
  };

  return (
    <button
      onClick={() => {
        haptic.medium();
        onClick();
      }}
      className={cn(
        'fixed right-4 z-40 flex items-center gap-2 rounded-full transition-all active:scale-95',
        label ? 'px-5 h-14' : 'w-14 h-14 justify-center',
        variants[variant]
      )}
      style={{ bottom: `calc(${MOBILE_TOKENS.safeArea.bottom} + 5rem)` }}
    >
      {icon}
      {label && <span className="font-medium">{label}</span>}
    </button>
  );
}
