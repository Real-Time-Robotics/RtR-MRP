'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';
import { clientLogger } from '@/lib/client-logger';
import {
  AlertTriangle,
  Trash2,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';

// =============================================================================
// CONFIRM DIALOG
// Reusable confirmation dialogs with different variants
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export type DialogVariant = 'danger' | 'warning' | 'info' | 'default';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

// =============================================================================
// DIALOG COMPONENT
// =============================================================================

const variantConfig = {
  danger: {
    icon: <Trash2 className="w-6 h-6" />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    confirmText: 'text-white',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    confirmBg: 'bg-amber-600 hover:bg-amber-700',
    confirmText: 'text-white',
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    confirmText: 'text-white',
  },
  default: {
    icon: <HelpCircle className="w-6 h-6" />,
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
    confirmBg: 'bg-purple-600 hover:bg-purple-700',
    confirmText: 'text-white',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  const [isConfirming, setIsConfirming] = useState(false);
  const config = variantConfig[variant];

  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      clientLogger.error('Confirm error', error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  const loading = isLoading || isConfirming;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        role="presentation"
        onClick={!loading ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className={cn('p-3 rounded-xl', config.iconBg)}>
              <span className={config.iconColor}>{icon || config.icon}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              {description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {resolvedCancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50',
                config.confirmBg,
                config.confirmText
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {resolvedConfirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// PRESET DIALOGS
// =============================================================================

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  itemType?: string;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isLoading,
}: DeleteConfirmDialogProps) {
  const { t } = useLanguage();
  const resolvedItemType = itemType || t('confirm.item');
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('common.confirmDelete', { itemType: resolvedItemType })}
      description={
        itemName
          ? t('confirm.deleteWithName', { name: itemName })
          : t('confirm.deleteGeneric', { itemType: resolvedItemType })
      }
      confirmLabel={t('common.delete')}
      variant="danger"
      isLoading={isLoading}
    />
  );
}

export function DiscardChangesDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('confirm.discardTitle')}
      description={t('confirm.discardDescription')}
      confirmLabel={t('confirm.discardConfirm')}
      variant="warning"
    />
  );
}

export function UnsavedChangesDialog({
  isOpen,
  onClose,
  onSave,
  onDiscard,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" role="presentation" onClick={onClose} />
      )}

      {/* Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('common.confirmSave')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('confirm.unsavedDescription')}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={onDiscard}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
              >
                {t('common.dontSave')}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-xl font-medium transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// CONTEXT & HOOK FOR GLOBAL DIALOGS
// =============================================================================

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    dialogState.resolve?.(false);
    setDialogState({ isOpen: false, options: null, resolve: null });
  }, [dialogState.resolve]);

  const handleConfirm = useCallback(() => {
    dialogState.resolve?.(true);
    setDialogState({ isOpen: false, options: null, resolve: null });
  }, [dialogState.resolve]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState.options && (
        <ConfirmDialog
          isOpen={dialogState.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          {...dialogState.options}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export default ConfirmDialog;
