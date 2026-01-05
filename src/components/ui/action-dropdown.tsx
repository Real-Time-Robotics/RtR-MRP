'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Permission, rolePermissions, UserRole } from '@/lib/auth/auth-types';
import { cn } from '@/lib/utils';
import {
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// ACTION DROPDOWN
// Dropdown menu for row-level actions with permission checking
// =============================================================================

export interface ActionItem {
  /** Display label */
  label: string;
  /** Icon to show */
  icon?: LucideIcon;
  /** Permission required (if not set, always visible) */
  permission?: Permission;
  /** Click handler */
  onClick?: () => void;
  /** Link href (alternative to onClick) */
  href?: string;
  /** Visual variant */
  variant?: 'default' | 'destructive' | 'success';
  /** Add separator after this item */
  separator?: boolean;
  /** Disable this item */
  disabled?: boolean;
  /** Custom class */
  className?: string;
}

// Alias for backwards compatibility
export type ActionDropdownItem = ActionItem;

interface ActionDropdownProps {
  /** Action items to display */
  items: ActionItem[];
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Dropdown alignment */
  align?: 'start' | 'center' | 'end';
  /** Additional class for trigger */
  className?: string;
}

export function ActionDropdown({
  items,
  trigger,
  align = 'end',
  className,
}: ActionDropdownProps) {
  const { data: session } = useSession();

  // Get user permissions
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;
  const userPermissions = userRole ? rolePermissions[userRole] || [] : [];

  // Filter items by permission
  const visibleItems = items.filter(item => {
    if (!item.permission) return true;
    return userPermissions.includes(item.permission);
  });

  // Don't render if no items
  if (visibleItems.length === 0) return null;

  const variantClasses: Record<string, string> = {
    default: '',
    destructive: 'text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400',
    success: 'text-green-600 dark:text-green-400 focus:text-green-600 dark:focus:text-green-400',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 w-8 p-0', className)}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {visibleItems.map((item, index) => (
          <React.Fragment key={index}>
            {item.href ? (
              <DropdownMenuItem asChild disabled={item.disabled}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 cursor-pointer',
                    variantClasses[item.variant || 'default'],
                    item.className
                  )}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={item.onClick}
                disabled={item.disabled}
                className={cn(
                  'flex items-center gap-2 cursor-pointer',
                  variantClasses[item.variant || 'default'],
                  item.className
                )}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </DropdownMenuItem>
            )}
            {item.separator && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// PREDEFINED ACTION SETS
// Common action configurations for different entity types
// =============================================================================

interface EntityActionsConfig {
  id: string;
  basePath: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  viewPermission?: Permission;
  editPermission?: Permission;
  deletePermission?: Permission;
  approvePermission?: Permission;
}

export function createEntityActions({
  id,
  basePath,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onApprove,
  onReject,
  viewPermission = 'orders:view',
  editPermission = 'orders:edit',
  deletePermission = 'orders:delete',
  approvePermission = 'orders:approve',
}: EntityActionsConfig): ActionItem[] {
  const actions: ActionItem[] = [];

  // View
  actions.push({
    label: 'Xem chi tiết',
    icon: Eye,
    href: onView ? undefined : `${basePath}/${id}`,
    onClick: onView,
    permission: viewPermission,
  });

  // Edit
  actions.push({
    label: 'Chỉnh sửa',
    icon: Edit2,
    href: onEdit ? undefined : `${basePath}/${id}/edit`,
    onClick: onEdit,
    permission: editPermission,
  });

  // Duplicate
  if (onDuplicate) {
    actions.push({
      label: 'Nhân bản',
      icon: Copy,
      onClick: onDuplicate,
      permission: editPermission,
    });
  }

  // Export
  if (onExport) {
    actions.push({
      label: 'Xuất file',
      icon: Download,
      onClick: onExport,
      separator: true,
    });
  }

  // Approve
  if (onApprove) {
    actions.push({
      label: 'Phê duyệt',
      icon: CheckCircle,
      onClick: onApprove,
      variant: 'success',
      permission: approvePermission,
    });
  }

  // Reject
  if (onReject) {
    actions.push({
      label: 'Từ chối',
      icon: XCircle,
      onClick: onReject,
      variant: 'destructive',
      permission: approvePermission,
      separator: true,
    });
  }

  // Delete
  actions.push({
    label: 'Xóa',
    icon: Trash2,
    onClick: onDelete,
    variant: 'destructive',
    permission: deletePermission,
  });

  return actions;
}

// =============================================================================
// SUPPLIER ACTIONS
// =============================================================================

export function createSupplierActions(
  id: string,
  onEdit?: () => void,
  onDelete?: () => void
): ActionItem[] {
  return [
    {
      label: 'Xem chi tiết',
      icon: Eye,
      href: `/suppliers/${id}`,
    },
    {
      label: 'Chỉnh sửa',
      icon: Edit2,
      onClick: onEdit,
      permission: 'orders:edit',
    },
    {
      label: 'Mở trang nhà cung cấp',
      icon: ExternalLink,
      separator: true,
    },
    {
      label: 'Xóa',
      icon: Trash2,
      onClick: onDelete,
      variant: 'destructive',
      permission: 'orders:delete',
    },
  ];
}

// =============================================================================
// ORDER ACTIONS
// =============================================================================

export function createOrderActions(
  id: string,
  type: 'sales' | 'purchase',
  status: string,
  onEdit?: () => void,
  onDelete?: () => void,
  onApprove?: () => void,
  onCancel?: () => void
): ActionItem[] {
  const basePath = type === 'sales' ? '/orders' : '/purchasing';
  const actions: ActionItem[] = [
    {
      label: 'Xem chi tiết',
      icon: Eye,
      href: `${basePath}/${id}`,
    },
  ];

  // Only allow edit for draft/pending orders
  if (['draft', 'pending', 'confirmed'].includes(status)) {
    actions.push({
      label: 'Chỉnh sửa',
      icon: Edit2,
      onClick: onEdit,
      permission: 'orders:edit',
    });
  }

  // Approve for pending orders
  if (status === 'pending' && onApprove) {
    actions.push({
      label: 'Phê duyệt',
      icon: CheckCircle,
      onClick: onApprove,
      variant: 'success',
      permission: 'orders:approve',
    });
  }

  // Cancel for non-completed orders
  if (!['completed', 'cancelled'].includes(status) && onCancel) {
    actions.push({
      label: 'Hủy đơn hàng',
      icon: XCircle,
      onClick: onCancel,
      variant: 'destructive',
      permission: 'orders:edit',
      separator: true,
    });
  }

  // Delete only for draft
  if (status === 'draft') {
    actions.push({
      label: 'Xóa',
      icon: Trash2,
      onClick: onDelete,
      variant: 'destructive',
      permission: 'orders:delete',
    });
  }

  return actions;
}

// =============================================================================
// INVENTORY ACTIONS
// =============================================================================

export function createInventoryActions(
  id: string,
  onAdjust?: () => void,
  onTransfer?: () => void,
  onViewHistory?: () => void
): ActionItem[] {
  return [
    {
      label: 'Xem chi tiết',
      icon: Eye,
      href: `/inventory/${id}`,
    },
    {
      label: 'Điều chỉnh số lượng',
      icon: Edit2,
      onClick: onAdjust,
      permission: 'inventory:adjust',
    },
    {
      label: 'Chuyển kho',
      icon: ExternalLink,
      onClick: onTransfer,
      permission: 'inventory:transfer',
      separator: true,
    },
    {
      label: 'Xem lịch sử',
      icon: Eye,
      onClick: onViewHistory,
    },
  ];
}

export default ActionDropdown;
