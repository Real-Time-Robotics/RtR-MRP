// =============================================================================
// RTR MRP - AUTH (RTR Auth Gateway Integration)
// Drop-in replacement for NextAuth's auth() function.
// All existing code calling `await auth()` continues to work unchanged.
// =============================================================================

import { getRtrSession } from '@/lib/auth-gateway/verify';
import type { RtrSession } from '@/lib/auth-gateway/types';
import type { UserRole } from './roles';

// Re-export UserRole for backward compatibility
export type { UserRole };

/**
 * Get current auth session.
 *
 * Backward-compatible with NextAuth's auth() — returns { user: { id, email, name, role } }
 * or null if not authenticated.
 */
export async function auth(): Promise<RtrSession | null> {
  return getRtrSession();
}

// Provide named exports that old code may reference
export default auth;
