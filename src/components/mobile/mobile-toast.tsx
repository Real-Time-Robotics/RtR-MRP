// =============================================================================
// MOBILE TOAST
// =============================================================================

'use client';

import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOBILE_TOKENS, haptic } from './mobile-tokens';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ toast: (type: ToastType, message: string) => void } | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within MobileToastProvider');
  return context;
}

export function MobileToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = Math.random().toString(36).slice(2);

    if (type === 'success') haptic.success();
    else if (type === 'error') haptic.error();
    else haptic.light();

    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-600',
    info: 'bg-blue-600',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-0 inset-x-0 z-[100] pointer-events-none px-4 pt-4"
        style={{ paddingTop: `calc(${MOBILE_TOKENS.safeArea.top} + 1rem)` }}>
        <div className="max-w-lg mx-auto space-y-2">
          {toasts.map((t) => (
            <div key={t.id} className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-white shadow-lg',
              'animate-in slide-in-from-top-2 fade-in duration-300',
              colors[t.type]
            )}>
              {icons[t.type]}
              <span className="flex-1 font-medium truncate">{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
