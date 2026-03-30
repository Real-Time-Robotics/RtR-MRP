// =============================================================================
// RTR AUTH GATEWAY — JWT VERIFICATION
// Core verification logic for rtr_access_token cookie
// =============================================================================

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { RtrJwtPayload, RtrUser, RtrSession } from './types';
import { RTR_AUTH_CONFIG } from './types';
import { mapToMrpRole } from './permissions';

/**
 * Get JWT secret as Uint8Array for jose library
 */
function getSecret(): Uint8Array {
  const secret = process.env.RTR_JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
  return new TextEncoder().encode(secret);
}

/**
 * Verify a JWT token string and return the payload.
 * Returns null on any verification failure.
 */
export async function verifyRtrToken(token: string): Promise<RtrJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [RTR_AUTH_CONFIG.algorithm],
    });
    return payload as unknown as RtrJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Map JWT payload to RtrUser with MRP role mapping.
 * Returns null if user has no MRP access.
 */
function mapPayloadToUser(payload: RtrJwtPayload): RtrUser | null {
  const mrpRole = mapToMrpRole(payload);
  if (!mrpRole) return null;

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    dept: payload.dept,
    role: mrpRole,
    role_level: payload.role_level,
    gatewayPerms: payload.permissions?.[RTR_AUTH_CONFIG.appCode] || [],
  };
}

/**
 * Server-side: Read rtr_access_token from cookies and verify.
 * Use in Server Components and API Routes (NOT middleware).
 *
 * Returns RtrSession (backward-compatible with NextAuth session shape)
 * or null if not authenticated.
 */
export async function getRtrSession(): Promise<RtrSession | null> {
  try {
    const cookieStore = await cookies();

    // Primary: read rtr_access_token cookie
    let token = cookieStore.get(RTR_AUTH_CONFIG.cookieName)?.value;

    // Dev fallback: read from Authorization header is handled in middleware,
    // not here (cookies() doesn't expose headers)
    if (!token) return null;

    const payload = await verifyRtrToken(token);
    if (!payload) return null;

    const user = mapPayloadToUser(payload);
    if (!user) return null;

    return { user };
  } catch {
    return null;
  }
}

/**
 * Middleware-compatible: Read token from NextRequest.
 * Middleware cannot use cookies() from next/headers, must use request.cookies.
 *
 * Returns RtrJwtPayload or null.
 */
export async function verifyFromRequest(request: NextRequest): Promise<RtrJwtPayload | null> {
  // Primary: rtr_access_token cookie
  let token = request.cookies.get(RTR_AUTH_CONFIG.cookieName)?.value;

  // Dev fallback: Authorization Bearer header
  if (!token && process.env.NODE_ENV === 'development') {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) return null;

  return verifyRtrToken(token);
}

/**
 * Middleware-compatible: Get mapped RtrUser from request.
 * Returns null if not authenticated or no MRP access.
 */
export async function getUserFromRequest(request: NextRequest): Promise<RtrUser | null> {
  const payload = await verifyFromRequest(request);
  if (!payload) return null;
  return mapPayloadToUser(payload);
}
