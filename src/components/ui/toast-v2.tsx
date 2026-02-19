'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TOAST NOTIFICATION SYSTEM
// Global toast notifications with auto-dismiss
// =============================================================================

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, toast: Partial<Toast>) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  loading: (title: string, description?: string) => string;
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => Promise<T>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================================================
// TOAST ITEM COMPONENT
// =============================================================================

const toastConfig = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    iconClass: 'text-green-500',
    bgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    iconClass: 'text-blue-500',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  },
  loading: {
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    iconClass: 'text-purple-500',
    bgClass: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const config = toastConfig[toast.type];
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [toast.id, onRemove]);

  // Auto dismiss
  useEffect(() => {
    if (toast.type === 'loading' || !toast.duration) return;
    
    const timer = setTimeout(handleRemove, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, toast.type, handleRemove]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-lg',
        'transition-all duration-200',
        'bg-white dark:bg-gray-800',
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
        config.bgClass
      )}
      role="alert"
    >
      <div className={cn('flex-shrink-0 mt-0.5', config.iconClass)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{toast.title}</p>
        {toast.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      {toast.type !== 'loading' && (
        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Đóng"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// TOAST CONTAINER
// =============================================================================

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// TOAST PROVIDER
// =============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  defaultDuration?: number;
}

export function ToastProvider({ children, defaultDuration = 5000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id, duration: toast.duration ?? defaultDuration }]);
    return id;
  }, [defaultDuration]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const success = useCallback((title: string, description?: string) => {
    return addToast({ type: 'success', title, description });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    return addToast({ type: 'error', title, description });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    return addToast({ type: 'warning', title, description });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    return addToast({ type: 'info', title, description });
  }, [addToast]);

  const loading = useCallback((title: string, description?: string) => {
    return addToast({ type: 'loading', title, description, duration: 0 });
  }, [addToast]);

  const promiseToast = useCallback(async <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ): Promise<T> => {
    const id = loading(messages.loading);
    try {
      const result = await promise;
      updateToast(id, { type: 'success', title: messages.success, duration: defaultDuration });
      return result;
    } catch (err) {
      updateToast(id, { type: 'error', title: messages.error, duration: defaultDuration });
      throw err;
    }
  }, [loading, updateToast, defaultDuration]);

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    success,
    error,
    warning,
    info,
    loading,
    promise: promiseToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// STANDALONE TOAST FUNCTION (for use outside React components)
// =============================================================================

let toastRef: ToastContextValue | null = null;

export function setToastRef(ref: ToastContextValue) {
  toastRef = ref;
}

export const toast = {
  success: (title: string, description?: string) => toastRef?.success(title, description),
  error: (title: string, description?: string) => toastRef?.error(title, description),
  warning: (title: string, description?: string) => toastRef?.warning(title, description),
  info: (title: string, description?: string) => toastRef?.info(title, description),
  loading: (title: string, description?: string) => toastRef?.loading(title, description),
  dismiss: (id: string) => toastRef?.removeToast(id),
};

export default ToastProvider;
