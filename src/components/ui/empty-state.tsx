'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  Package,
  ShoppingCart,
  FileText,
  Search,
  Inbox,
  AlertCircle,
  WifiOff,
  Lock,
  Plus,
  RefreshCw,
  ArrowRight,
  Sparkles,
  FolderOpen,
  Database,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// EMPTY STATES
// Placeholder components for empty/error states
// =============================================================================

// =============================================================================
// BASE EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizes = {
    sm: { icon: 'w-12 h-12', title: 'text-base', desc: 'text-sm', padding: 'py-8' },
    md: { icon: 'w-16 h-16', title: 'text-lg', desc: 'text-sm', padding: 'py-12' },
    lg: { icon: 'w-20 h-20', title: 'text-xl', desc: 'text-base', padding: 'py-16' },
  };

  const s = sizes[size];

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', s.padding, className)}>
      {icon && (
        <div className={cn('mx-auto text-gray-300 dark:text-gray-600 mb-4', s.icon)}>
          {icon}
        </div>
      )}
      <h3 className={cn('font-semibold text-gray-900 dark:text-white mb-2', s.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-gray-500 dark:text-gray-400 max-w-sm mb-6', s.desc)}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            action.href ? (
              <Link
                href={action.href}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {action.label}
              </button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {secondaryAction.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={secondaryAction.onClick}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {secondaryAction.label}
                <ArrowRight className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PRESET EMPTY STATES
// =============================================================================

// No Data
export function NoDataState({
  entity = 'dữ liệu',
  actionLabel,
  actionHref,
  onAction,
}: {
  entity?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<Inbox className="w-full h-full" />}
      title={t('empty.noData', { entity })}
      description={t('empty.noDataDescription', { entity })}
      action={actionLabel ? { label: actionLabel, href: actionHref, onClick: onAction } : undefined}
    />
  );
}

// No Search Results
export function NoSearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<Search className="w-full h-full" />}
      title={t('empty.noSearchResults')}
      description={t('empty.noSearchResultsDescription', { query })}
      action={onClear ? { label: t('empty.clearSearch'), onClick: onClear } : undefined}
    />
  );
}

// No Orders
export function NoOrdersState({ actionHref = '/sales/new' }: { actionHref?: string }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<ShoppingCart className="w-full h-full" />}
      title={t('empty.noOrders')}
      description={t('empty.noOrdersDescription')}
      action={{ label: t('empty.createOrder'), href: actionHref }}
    />
  );
}

// No Inventory
export function NoInventoryState({ actionHref = '/parts/new' }: { actionHref?: string }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<Package className="w-full h-full" />}
      title={t('empty.noParts')}
      description={t('empty.noPartsDescription')}
      action={{ label: t('empty.addPart'), href: actionHref }}
    />
  );
}

// No Documents
export function NoDocumentsState() {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<FileText className="w-full h-full" />}
      title={t('empty.noDocuments')}
      description={t('empty.noDocumentsDescription')}
    />
  );
}

// Empty Folder
export function EmptyFolderState({ folderName }: { folderName?: string }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<FolderOpen className="w-full h-full" />}
      title={folderName ? t('empty.folderEmpty', { folderName }) : t('empty.emptyFolder')}
      description={t('empty.emptyFolderDescription')}
    />
  );
}

// =============================================================================
// ERROR STATES
// =============================================================================

// General Error
export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<AlertCircle className="w-full h-full text-red-400" />}
      title={title || t('error.occurred')}
      description={description || t('error.loadFailed')}
      action={onRetry ? { label: t('error.retry'), onClick: onRetry } : undefined}
    />
  );
}

// Network Error
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<WifiOff className="w-full h-full text-amber-400" />}
      title={t('error.connection')}
      description={t('error.connectionDescription')}
      action={onRetry ? { label: t('error.retry'), onClick: onRetry } : undefined}
    />
  );
}

// Access Denied
export function AccessDeniedState({ onGoBack }: { onGoBack?: () => void }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<Lock className="w-full h-full text-red-400" />}
      title={t('error.noAccess')}
      description={t('error.noAccessDescription')}
      action={onGoBack ? { label: t('error.goBack'), onClick: onGoBack } : undefined}
    />
  );
}

// Server Error
export function ServerErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<Server className="w-full h-full text-red-400" />}
      title={t('error.server')}
      description={t('error.serverDescription')}
      action={onRetry ? { label: t('error.retry'), onClick: onRetry } : undefined}
    />
  );
}

// Database Error
export function DatabaseErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<Database className="w-full h-full text-red-400" />}
      title={t('error.database')}
      description={t('error.databaseDescription')}
      action={onRetry ? { label: t('error.retry'), onClick: onRetry } : undefined}
    />
  );
}

// =============================================================================
// SPECIAL STATES
// =============================================================================

// Coming Soon
export function ComingSoonState({ featureName }: { featureName?: string }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<Sparkles className="w-full h-full text-purple-400" />}
      title={t('empty.comingSoon')}
      description={featureName ? t('empty.comingSoonFeature', { featureName }) : t('empty.comingSoonDescription')}
    />
  );
}

// Under Maintenance
export function MaintenanceState() {
  const { t } = useLanguage();
  return (
    <EmptyState
      icon={<RefreshCw className="w-full h-full text-amber-400 animate-spin-slow" />}
      title={t('error.maintenance')}
      description={t('error.maintenanceDescription')}
    />
  );
}

// =============================================================================
// WRAPPER COMPONENT
// =============================================================================

interface EmptyStateWrapperProps {
  isEmpty: boolean;
  isLoading?: boolean;
  isError?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyState: React.ReactNode;
  loadingState?: React.ReactNode;
  children: React.ReactNode;
}

export function EmptyStateWrapper({
  isEmpty,
  isLoading,
  isError,
  error,
  onRetry,
  emptyState,
  loadingState,
  children,
}: EmptyStateWrapperProps) {
  if (isLoading && loadingState) {
    return <>{loadingState}</>;
  }

  if (isError) {
    return <ErrorState description={error} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <>{emptyState}</>;
  }

  return <>{children}</>;
}

export default EmptyState;
