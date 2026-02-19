'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// =============================================================================
// MODAL/DIALOG COMPONENT
// Accessible modal with multiple variants and animations
// =============================================================================

export interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal content */
  children?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Center modal vertically */
  centered?: boolean;
  /** Custom class for modal content */
  className?: string;
  /** Prevent body scroll when open */
  preventScroll?: boolean;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  centered = true,
  className,
  preventScroll = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, preventScroll]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-modal flex p-4',
        centered ? 'items-center justify-center' : 'items-start justify-center pt-16'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={handleOverlayClick}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative bg-white dark:bg-steel-dark rounded-2xl shadow-2xl w-full',
          'animate-scale-in',
          'focus:outline-none',
          modalSizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-slate-900 dark:text-mrp-text-primary dark:text-mrp-text-primary"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-mrp-text-secondary">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 -mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-mrp-text-muted dark:hover:text-mrp-text-primary dark:hover:bg-gunmetal rounded-lg transition-colors"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        {children && (
          <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-gunmetal rounded-b-2xl border-t border-slate-100 dark:border-industrial-slate">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';

// =============================================================================
// CONFIRM DIALOG
// Pre-configured confirmation modal
// =============================================================================

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

const variantConfig = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-danger-100',
    iconColor: 'text-danger-600',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: Info,
    iconBg: 'bg-info-100',
    iconColor: 'text-info-600',
    buttonVariant: 'primary' as const,
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-success-100',
    iconColor: 'text-success-600',
    buttonVariant: 'success' as const,
  },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        {/* Icon */}
        <div
          className={cn(
            'mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4',
            config.iconBg
          )}
        >
          <IconComponent className={cn('h-6 w-6', config.iconColor)} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900 dark:text-mrp-text-primary mb-2">{title}</h3>

        {/* Message */}
        <p className="text-sm text-slate-500 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

ConfirmDialog.displayName = 'ConfirmDialog';

// =============================================================================
// ALERT DIALOG
// Simple alert with single action
// =============================================================================

export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  variant = 'info',
}) => {
  const icons = {
    info: { icon: Info, bg: 'bg-info-100', color: 'text-info-600' },
    success: { icon: CheckCircle, bg: 'bg-success-100', color: 'text-success-600' },
    warning: { icon: AlertCircle, bg: 'bg-warning-100', color: 'text-warning-600' },
    error: { icon: AlertTriangle, bg: 'bg-danger-100', color: 'text-danger-600' },
  };

  const config = icons[variant];
  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        <div
          className={cn(
            'mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4',
            config.bg
          )}
        >
          <IconComponent className={cn('h-6 w-6', config.color)} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-mrp-text-primary mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <Button onClick={onClose} fullWidth>
          {buttonText}
        </Button>
      </div>
    </Modal>
  );
};

AlertDialog.displayName = 'AlertDialog';

// =============================================================================
// DRAWER/SHEET
// Slide-in panel from side
// =============================================================================

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

const drawerSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  position = 'right',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute top-0 bottom-0 bg-white dark:bg-steel-dark shadow-2xl w-full flex flex-col',
          drawerSizes[size],
          position === 'left' ? 'left-0 animate-slide-right' : 'right-0 animate-slide-left'
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-industrial-slate">
            {title && (
              <h2 className="text-lg font-semibold text-slate-900 dark:text-mrp-text-primary">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-mrp-text-muted dark:hover:text-mrp-text-primary dark:hover:bg-gunmetal rounded-lg transition-colors"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-industrial-slate bg-slate-50 dark:bg-gunmetal">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Drawer.displayName = 'Drawer';

// =============================================================================
// EXPORTS
// =============================================================================

export { Modal, ConfirmDialog, AlertDialog, Drawer };
export default Modal;
