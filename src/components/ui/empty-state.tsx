'use client';

import React from 'react';
import Link from 'next/link';
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
  return (
    <EmptyState
      icon={<Inbox className="w-full h-full" />}
      title={`Chưa có ${entity}`}
      description={`Bắt đầu bằng cách thêm ${entity} mới vào hệ thống.`}
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
  return (
    <EmptyState
      icon={<Search className="w-full h-full" />}
      title="Không tìm thấy kết quả"
      description={`Không tìm thấy kết quả nào cho "${query}". Thử tìm kiếm với từ khóa khác.`}
      action={onClear ? { label: 'Xóa tìm kiếm', onClick: onClear } : undefined}
    />
  );
}

// No Orders
export function NoOrdersState({ actionHref = '/sales/new' }: { actionHref?: string }) {
  return (
    <EmptyState
      icon={<ShoppingCart className="w-full h-full" />}
      title="Chưa có đơn hàng"
      description="Tạo đơn hàng đầu tiên để bắt đầu quản lý bán hàng."
      action={{ label: 'Tạo đơn hàng', href: actionHref }}
    />
  );
}

// No Inventory
export function NoInventoryState({ actionHref = '/parts/new' }: { actionHref?: string }) {
  return (
    <EmptyState
      icon={<Package className="w-full h-full" />}
      title="Kho hàng trống"
      description="Thêm vật tư vào danh mục để bắt đầu quản lý tồn kho."
      action={{ label: 'Thêm vật tư', href: actionHref }}
    />
  );
}

// No Documents
export function NoDocumentsState() {
  return (
    <EmptyState
      icon={<FileText className="w-full h-full" />}
      title="Chưa có tài liệu"
      description="Các tài liệu và báo cáo sẽ xuất hiện ở đây."
    />
  );
}

// Empty Folder
export function EmptyFolderState({ folderName }: { folderName?: string }) {
  return (
    <EmptyState
      icon={<FolderOpen className="w-full h-full" />}
      title={folderName ? `${folderName} trống` : 'Thư mục trống'}
      description="Chưa có nội dung trong thư mục này."
    />
  );
}

// =============================================================================
// ERROR STATES
// =============================================================================

// General Error
export function ErrorState({ 
  title = 'Đã xảy ra lỗi',
  description,
  onRetry,
}: { 
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="w-full h-full text-red-400" />}
      title={title}
      description={description || 'Không thể tải dữ liệu. Vui lòng thử lại sau.'}
      action={onRetry ? { label: 'Thử lại', onClick: onRetry } : undefined}
    />
  );
}

// Network Error
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<WifiOff className="w-full h-full text-amber-400" />}
      title="Lỗi kết nối"
      description="Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng và thử lại."
      action={onRetry ? { label: 'Thử lại', onClick: onRetry } : undefined}
    />
  );
}

// Access Denied
export function AccessDeniedState({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <EmptyState
      icon={<Lock className="w-full h-full text-red-400" />}
      title="Không có quyền truy cập"
      description="Bạn không có quyền xem nội dung này. Liên hệ quản trị viên nếu cần hỗ trợ."
      action={onGoBack ? { label: 'Quay lại', onClick: onGoBack } : undefined}
    />
  );
}

// Server Error
export function ServerErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<Server className="w-full h-full text-red-400" />}
      title="Lỗi máy chủ"
      description="Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút."
      action={onRetry ? { label: 'Thử lại', onClick: onRetry } : undefined}
    />
  );
}

// Database Error
export function DatabaseErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<Database className="w-full h-full text-red-400" />}
      title="Lỗi cơ sở dữ liệu"
      description="Không thể truy cập cơ sở dữ liệu. Vui lòng liên hệ quản trị viên."
      action={onRetry ? { label: 'Thử lại', onClick: onRetry } : undefined}
    />
  );
}

// =============================================================================
// SPECIAL STATES
// =============================================================================

// Coming Soon
export function ComingSoonState({ featureName }: { featureName?: string }) {
  return (
    <EmptyState
      icon={<Sparkles className="w-full h-full text-purple-400" />}
      title="Sắp ra mắt"
      description={featureName ? `Tính năng ${featureName} đang được phát triển và sẽ sớm có mặt.` : 'Tính năng này đang được phát triển và sẽ sớm có mặt.'}
    />
  );
}

// Under Maintenance
export function MaintenanceState() {
  return (
    <EmptyState
      icon={<RefreshCw className="w-full h-full text-amber-400 animate-spin-slow" />}
      title="Đang bảo trì"
      description="Hệ thống đang được bảo trì. Vui lòng quay lại sau."
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
    return <ErrorState title="Đã xảy ra lỗi" description={error} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <>{emptyState}</>;
  }

  return <>{children}</>;
}

export default EmptyState;
