'use client';

// =============================================================================
// RTR AUTH GATEWAY — CLIENT-SIDE AUTH
// React context and hooks replacing NextAuth SessionProvider + useSession
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { RtrUser } from './types';
import { RTR_AUTH_CONFIG } from './types';
import type { Permission } from '@/lib/auth/auth-types';
import { rolePermissions } from '@/lib/auth/auth-types';
import type { UserRole } from '@/lib/auth/auth-types';

// =============================================================================
// TYPES
// =============================================================================

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface RtrAuthContextValue {
  user: RtrUser | null;
  status: AuthStatus;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const RtrAuthContext = createContext<RtrAuthContextValue>({
  user: null,
  status: 'loading',
  logout: () => {},
  refreshSession: async () => {},
});

// =============================================================================
// PROVIDER
// =============================================================================

export function RtrAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<RtrUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/auth/me', {
        credentials: 'include',
      });

      if (!res.ok) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setUser(data.data);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = useCallback(() => {
    // Clear any local storage
    try {
      localStorage.removeItem('auth-session');
      localStorage.removeItem('rtr-mrp-session');
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }

    // Redirect to Auth Gateway logout
    const redirectUrl = encodeURIComponent(window.location.origin);
    window.location.href = `${RTR_AUTH_CONFIG.authUrl}/logout?redirect=${redirectUrl}`;
  }, []);

  const value: RtrAuthContextValue = {
    user,
    status,
    logout,
    refreshSession: fetchSession,
  };

  return React.createElement(RtrAuthContext.Provider, { value }, children);
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Drop-in replacement for useSession() from next-auth/react.
 * Returns { data: { user }, status } with the same shape.
 */
export function useRtrSession() {
  const ctx = useContext(RtrAuthContext);

  return {
    data: ctx.user ? { user: ctx.user } : null,
    status: ctx.status,
    update: ctx.refreshSession,
  };
}

/**
 * Get current user or null.
 */
export function useRtrUser(): RtrUser | null {
  const ctx = useContext(RtrAuthContext);
  return ctx.user;
}

/**
 * Get logout function.
 */
export function useRtrLogout() {
  const ctx = useContext(RtrAuthContext);
  return ctx.logout;
}

/**
 * Check if current user has a specific permission.
 */
export function useRtrPermission(permission: Permission): boolean {
  const ctx = useContext(RtrAuthContext);
  if (!ctx.user) return false;
  const perms = rolePermissions[ctx.user.role as UserRole] || [];
  return perms.includes(permission);
}

/**
 * Get permission utilities for current user.
 */
export function useRtrPermissions() {
  const ctx = useContext(RtrAuthContext);
  const user = ctx.user;
  const role = (user?.role || 'viewer') as UserRole;
  const perms = rolePermissions[role] || [];

  return {
    can: (permission: Permission) => perms.includes(permission),
    canAny: (permissions: Permission[]) => permissions.some(p => perms.includes(p)),
    canAll: (permissions: Permission[]) => permissions.every(p => perms.includes(p)),
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager' || role === 'admin',
    permissions: perms,
  };
}
