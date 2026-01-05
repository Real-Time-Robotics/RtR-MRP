'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Permission, rolePermissions, UserRole } from '@/lib/auth/auth-types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';

// =============================================================================
// PERMISSION BUTTON
// A button that shows/hides or enables/disables based on user permissions
// =============================================================================

interface PermissionButtonProps extends ButtonProps {
  /** Required permission to show/enable the button */
  permission: Permission;
  /** What to render when user doesn't have permission (default: null = hide) */
  fallback?: React.ReactNode;
  /** Show as disabled instead of hiding when no permission */
  showDisabled?: boolean;
  /** Show tooltip explaining why button is disabled */
  disabledTooltip?: string;
}

export function PermissionButton({
  permission,
  fallback = null,
  showDisabled = false,
  disabledTooltip = 'Bạn không có quyền thực hiện hành động này',
  children,
  className,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { data: session } = useSession();

  // Get user role and check permission
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;
  const hasPermission = userRole ? rolePermissions[userRole]?.includes(permission) : false;

  // If no permission
  if (!hasPermission) {
    // Show disabled button with tooltip
    if (showDisabled) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  {...props}
                  disabled
                  className={cn('opacity-50 cursor-not-allowed', className)}
                >
                  {children}
                  <Lock className="w-3 h-3 ml-1.5 opacity-60" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{disabledTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    // Return fallback (default: null = hide completely)
    return <>{fallback}</>;
  }

  // User has permission - render normal button
  return (
    <Button {...props} disabled={disabled} className={className}>
      {children}
    </Button>
  );
}

// =============================================================================
// PERMISSION GATE
// Wrapper component to conditionally render children based on permissions
// =============================================================================

interface PermissionGateProps {
  /** Single permission required */
  permission?: Permission;
  /** Multiple permissions (use with requireAll) */
  permissions?: Permission[];
  /** Require all permissions (true) or any (false, default) */
  requireAll?: boolean;
  /** Content to render when permission is granted */
  children: React.ReactNode;
  /** Content to render when permission is denied (default: null) */
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { data: session } = useSession();

  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;

  if (!userRole) return <>{fallback}</>;

  const userPermissions = rolePermissions[userRole] || [];

  let hasAccess = false;

  if (permission) {
    // Single permission check
    hasAccess = userPermissions.includes(permission);
  } else if (permissions && permissions.length > 0) {
    // Multiple permissions check
    if (requireAll) {
      hasAccess = permissions.every(p => userPermissions.includes(p));
    } else {
      hasAccess = permissions.some(p => userPermissions.includes(p));
    }
  } else {
    // No permission specified = always show
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// =============================================================================
// USE PERMISSION HOOK
// Hook to check permissions in components
// =============================================================================

export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;

  if (!userRole) return false;

  const userPermissions = rolePermissions[userRole] || [];
  return userPermissions.includes(permission);
}

export function usePermissions() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;

  const can = (permission: Permission): boolean => {
    if (!userRole) return false;
    const userPermissions = rolePermissions[userRole] || [];
    return userPermissions.includes(permission);
  };

  const canAny = (permissions: Permission[]): boolean => {
    if (!userRole) return false;
    const userPermissions = rolePermissions[userRole] || [];
    return permissions.some(p => userPermissions.includes(p));
  };

  const canAll = (permissions: Permission[]): boolean => {
    if (!userRole) return false;
    const userPermissions = rolePermissions[userRole] || [];
    return permissions.every(p => userPermissions.includes(p));
  };

  return {
    can,
    canAny,
    canAll,
    role: userRole,
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isOperator: userRole === 'operator',
    isViewer: userRole === 'viewer',
  };
}

export default PermissionButton;
