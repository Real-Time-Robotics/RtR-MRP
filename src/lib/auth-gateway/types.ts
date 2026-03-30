// =============================================================================
// RTR AUTH GATEWAY — TYPE DEFINITIONS
// Shared types for Auth Gateway JWT integration
// =============================================================================

/**
 * JWT payload structure from RTR Auth Gateway (auth.rtrobotics.com)
 */
export interface RtrJwtPayload {
  sub: string;          // userId
  email: string;
  name: string;
  dept: string;         // department code
  role: string;         // gateway role: super_admin, admin, manager, staff, viewer
  role_level: number;   // 99, 30, 20, 10, 0
  permissions: Record<string, string[]>; // { mrp: ["read","write"], pm: ["read"] }
  iat?: number;
  exp?: number;
}

/**
 * Mapped user object for MRP app consumption.
 * This is what components and API routes receive.
 */
export interface RtrUser {
  id: string;
  email: string;
  name: string;
  dept: string;
  role: string;           // MRP-mapped role (admin, manager, supervisor, etc.)
  role_level: number;     // original gateway role_level
  gatewayPerms: string[]; // raw permissions from JWT: ["read","write","delete"]
  image?: string | null;
}

/**
 * Auth session shape — backward compatible with NextAuth session
 */
export interface RtrSession {
  user: RtrUser;
}

/**
 * Auth Gateway configuration
 */
export const RTR_AUTH_CONFIG = {
  cookieName: 'rtr_access_token',
  algorithm: 'HS256' as const,
  appCode: process.env.RTR_APP_CODE || 'mrp',
  authUrl: process.env.RTR_AUTH_GATEWAY_URL || 'https://auth.rtrobotics.com',
} as const;
