'use client';

import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  titleVi?: string;
  description?: string;
  descriptionVi?: string;
  language?: 'en' | 'vi';
  children: React.ReactNode;
  // Size on desktop (modal), always full-screen on mobile
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  // Show close button
  showClose?: boolean;
  // Footer content
  footer?: React.ReactNode;
  // Disable closing when clicking backdrop
  preventBackdropClose?: boolean;
  className?: string;
}

// =============================================================================
// SIZE CLASSES
// =============================================================================

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-4xl',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  titleVi,
  description,
  descriptionVi,
  language = 'vi',
  children,
  size = 'md',
  showClose = true,
  footer,
  preventBackdropClose = false,
  className,
}: ResponsiveModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventBackdropClose) {
        onClose();
      }
    },
    [onClose, preventBackdropClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const displayTitle = language === 'vi' && titleVi ? titleVi : title;
  const displayDescription =
    language === 'vi' && descriptionVi ? descriptionVi : description;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !preventBackdropClose && onClose()}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        {/* Modal Content */}
        <div
          className={cn(
            // Base styles
            'relative bg-white dark:bg-steel-dark flex flex-col',
            // Mobile: Full screen
            'h-full w-full',
            // Desktop: Centered modal with max-width
            'sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-xl sm:shadow-2xl',
            'sm:border sm:border-gray-200 dark:sm:border-mrp-border',
            // Animation
            'animate-in sm:fade-in-0 sm:zoom-in-95 slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300',
            // Size
            sizeClasses[size],
            className
          )}
        >
          {/* Header */}
          {(displayTitle || showClose) && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-mrp-border flex-shrink-0">
              {/* Mobile back button */}
              <button
                onClick={onClose}
                className="sm:hidden flex items-center justify-center w-10 h-10 -ml-2 text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal rounded-lg transition-colors touch-manipulation"
                aria-label="Quay lại"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="flex-1 min-w-0">
                {displayTitle && (
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-mrp-text-primary truncate">
                    {displayTitle}
                  </h2>
                )}
                {displayDescription && (
                  <p className="text-sm text-gray-500 dark:text-mrp-text-secondary truncate mt-0.5">
                    {displayDescription}
                  </p>
                )}
              </div>

              {/* Desktop close button */}
              {showClose && (
                <button
                  onClick={onClose}
                  className="hidden sm:flex items-center justify-center w-8 h-8 text-gray-500 dark:text-mrp-text-muted hover:bg-gray-100 dark:hover:bg-gunmetal rounded-lg transition-colors"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 pb-safe">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-mrp-border bg-gray-50 dark:bg-gunmetal/50 pb-safe sm:pb-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MODAL FOOTER COMPONENTS
// =============================================================================

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        // Mobile: Stack buttons vertically
        'flex-col-reverse sm:flex-row sm:justify-end',
        className
      )}
    >
      {children}
    </div>
  );
}

export function ModalButton({
  children,
  variant = 'secondary',
  onClick,
  disabled = false,
  loading = false,
  className,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const variantClasses = {
    primary:
      'bg-info-cyan text-white hover:bg-info-cyan/90 disabled:bg-info-cyan/50',
    secondary:
      'bg-gray-100 dark:bg-gunmetal text-gray-700 dark:text-mrp-text-secondary hover:bg-gray-200 dark:hover:bg-gunmetal-light',
    danger:
      'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
        // Mobile: Full width
        'w-full sm:w-auto',
        // Touch target
        'min-h-[44px] sm:min-h-0',
        'touch-manipulation',
        variantClasses[variant],
        'disabled:cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// =============================================================================
// CONFIRM DIALOG
// =============================================================================

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  titleVi?: string;
  message?: string;
  messageVi?: string;
  confirmText?: string;
  confirmTextVi?: string;
  cancelText?: string;
  cancelTextVi?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  language?: 'en' | 'vi';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  titleVi = 'Xác nhận',
  message = 'Are you sure you want to continue?',
  messageVi = 'Bạn có chắc chắn muốn tiếp tục?',
  confirmText = 'Confirm',
  confirmTextVi = 'Xác nhận',
  cancelText = 'Cancel',
  cancelTextVi = 'Hủy',
  variant = 'danger',
  loading = false,
  language = 'vi',
}: ConfirmDialogProps) {
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'vi' ? titleVi : title}
      language={language}
      size="sm"
      footer={
        <ModalFooter>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            {language === 'vi' ? cancelTextVi : cancelText}
          </ModalButton>
          <ModalButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {language === 'vi' ? confirmTextVi : confirmText}
          </ModalButton>
        </ModalFooter>
      }
    >
      <p className="text-gray-600 dark:text-mrp-text-secondary">
        {language === 'vi' ? messageVi : message}
      </p>
    </ResponsiveModal>
  );
}

export default ResponsiveModal;
