'use client';

import React from 'react';
import { useRtrSession } from '@/lib/auth-gateway/client';
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
  permission: Permission;
  fallback?: React.ReactNode;
  showDisabled?: boolean;
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
  const { data: session } = useRtrSession();

  const userRole = session?.user?.role as UserRole | undefined;
  const hasPermission = userRole ? rolePermissions[userRole]?.includes(permission) : false;

  if (!hasPermission) {
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
    return <>{fallback}</>;
  }

  return (
    <Button {...props} disabled={disabled} className={className}>
      {children}
    </Button>
  );
}

// =============================================================================
// PERMISSION GATE
// =============================================================================

interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { data: session } = useRtrSession();

  const userRole = session?.user?.role as UserRole | undefined;

  if (!userRole) return <>{fallback}</>;

  const userPermissions = rolePermissions[userRole] || [];

  let hasAccess = false;

  if (permission) {
    hasAccess = userPermissions.includes(permission);
  } else if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = permissions.every(p => userPermissions.includes(p));
    } else {
      hasAccess = permissions.some(p => userPermissions.includes(p));
    }
  } else {
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// =============================================================================
// HOOKS
// =============================================================================

export function usePermission(permission: Permission): boolean {
  const { data: session } = useRtrSession();
  const userRole = session?.user?.role as UserRole | undefined;

  if (!userRole) return false;

  const userPermissions = rolePermissions[userRole] || [];
  return userPermissions.includes(permission);
}

export function usePermissions() {
  const { data: session } = useRtrSession();
  const userRole = session?.user?.role as UserRole | undefined;

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
