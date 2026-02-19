'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TOAST NOTIFICATION SYSTEM
// Global toast notifications with auto-dismiss and stacking
// =============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience hooks
export const useSuccessToast = () => {
  const { addToast } = useToast();
  return (title: string, message?: string) =>
    addToast({ type: 'success', title, message });
};

export const useErrorToast = () => {
  const { addToast } = useToast();
  return (title: string, message?: string) =>
    addToast({ type: 'error', title, message });
};

// Toast icons
const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

// Toast styles (Industrial Precision dark mode)
const toastStyles = {
  success: {
    bg: 'bg-white dark:bg-steel-dark',
    border: 'border-l-4 border-l-success-500 dark:border-l-production-green',
    icon: 'text-success-500 dark:text-production-green',
  },
  error: {
    bg: 'bg-white dark:bg-steel-dark',
    border: 'border-l-4 border-l-danger-500 dark:border-l-urgent-red',
    icon: 'text-danger-500 dark:text-urgent-red',
  },
  warning: {
    bg: 'bg-white dark:bg-steel-dark',
    border: 'border-l-4 border-l-warning-500 dark:border-l-alert-amber',
    icon: 'text-warning-500 dark:text-alert-amber',
  },
  info: {
    bg: 'bg-white dark:bg-steel-dark',
    border: 'border-l-4 border-l-info-500 dark:border-l-info-cyan',
    icon: 'text-info-500 dark:text-info-cyan',
  },
  loading: {
    bg: 'bg-white dark:bg-steel-dark',
    border: 'border-l-4 border-l-primary-500 dark:border-l-info-cyan',
    icon: 'text-primary-500 dark:text-info-cyan',
  },
};

// Individual Toast component
interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const IconComponent = toastIcons[toast.type];
  const styles = toastStyles[toast.type];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg',
        'min-w-[320px] max-w-md',
        'animate-slide-left',
        styles.bg,
        styles.border,
        'border border-slate-200 dark:border-industrial-slate'
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0', styles.icon)}>
        <IconComponent
          className={cn(
            'h-5 w-5',
            toast.type === 'loading' && 'animate-spin'
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-mrp-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm text-slate-500 dark:text-mrp-text-secondary">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {toast.dismissible !== false && toast.type !== 'loading' && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-mrp-text-muted dark:hover:text-mrp-text-primary dark:hover:bg-gunmetal rounded transition-colors"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Toast Container
interface ToastContainerProps {
  position?: ToastPosition;
}

const positionStyles: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
}) => {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className={cn(
        'fixed z-toast flex flex-col gap-3',
        positionStyles[position]
      )}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Toast Provider
interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  defaultDuration?: number;
}

const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  defaultDuration = 5000,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? defaultDuration,
        dismissible: toast.dismissible ?? true,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss (except for loading toasts)
      if (newToast.type !== 'loading' && newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, newToast.duration);
      }

      return id;
    },
    [defaultDuration]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, updateToast, clearToasts }}
    >
      {children}
      <ToastContainer position={position} />
    </ToastContext.Provider>
  );
};

// =============================================================================
// TOAST HELPER FUNCTIONS
// Standalone functions for creating toasts (use within ToastProvider)
// =============================================================================

export const toast = {
  success: (title: string, message?: string, options?: Partial<Toast>) => {
    // This will be used with the hook
    return { type: 'success' as const, title, message, ...options };
  },
  error: (title: string, message?: string, options?: Partial<Toast>) => {
    return { type: 'error' as const, title, message, ...options };
  },
  warning: (title: string, message?: string, options?: Partial<Toast>) => {
    return { type: 'warning' as const, title, message, ...options };
  },
  info: (title: string, message?: string, options?: Partial<Toast>) => {
    return { type: 'info' as const, title, message, ...options };
  },
  loading: (title: string, message?: string, options?: Partial<Toast>) => {
    return { type: 'loading' as const, title, message, duration: 0, ...options };
  },
};

// =============================================================================
// INLINE ALERT
// Non-dismissible alert for inline use
// =============================================================================

export interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const alertStyles = {
  success: 'bg-success-50 border-success-200 text-success-800',
  error: 'bg-danger-50 border-danger-200 text-danger-800',
  warning: 'bg-warning-50 border-warning-200 text-warning-800',
  info: 'bg-info-50 border-info-200 text-info-800',
};

const alertIconStyles = {
  success: 'text-success-500',
  error: 'text-danger-500',
  warning: 'text-warning-500',
  info: 'text-info-500',
};

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  icon,
  dismissible = false,
  onDismiss,
  className,
}) => {
  const IconComponent = icon ? null : toastIcons[type];

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 p-4 rounded-lg border',
        alertStyles[type],
        className
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0', alertIconStyles[type])}>
        {icon || (IconComponent && <IconComponent className="h-5 w-5" />)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <div className={cn('text-sm', title && 'mt-1')}>{children}</div>
      </div>

      {/* Dismiss */}
      {dismissible && (
        <button
          onClick={onDismiss}
          className={cn(
            'flex-shrink-0 p-1 rounded transition-colors',
            'hover:bg-black/5',
            alertIconStyles[type]
          )}
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

Alert.displayName = 'Alert';

// =============================================================================
// EXPORTS
// =============================================================================

export { ToastProvider, ToastContainer, ToastItem, Alert };
export default ToastProvider;
