// =============================================================================
// RTR MRP - NEXT.JS MIDDLEWARE
// Route protection via RTR Auth Gateway, security headers, rate limiting
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFromRequest } from '@/lib/auth-gateway/verify';
import { mapToMrpRole } from '@/lib/auth-gateway/permissions';
import { hasPermission, type UserRole } from './lib/roles';

// =============================================================================
// CONFIGURATION
// =============================================================================

const AUTH_GATEWAY_URL = process.env.RTR_AUTH_GATEWAY_URL || 'https://auth.rtrobotics.com';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',       // redirect stub → Auth Gateway
  '/register',    // redirect stub → Auth Gateway
  '/forgot-password',
  '/reset-password',
  '/api/auth',    // legacy NextAuth routes (will 404, kept for safety)
  '/api/health',
  '/api/metrics',
  '/api/demo',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
];

// Static file extensions
const staticExtensions = ['.ico', '.png', '.jpg', '.jpeg', '.svg', '.css', '.js', '.woff', '.woff2'];

// Routes that require specific roles
const roleProtectedRoutes: Record<string, string[]> = {
  '/settings': ['admin'],
  '/users': ['admin'],
  '/api/v2/users': ['admin'],
  '/mrp-wizard': ['planner', 'manager', 'admin'],
  '/reports': ['planner', 'supervisor', 'manager', 'admin'],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isPublicRoute(pathname: string): boolean {
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return true;
  }
  return publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function getRequiredRoles(pathname: string): string[] | null {
  for (const [route, roles] of Object.entries(roleProtectedRoutes)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return roles;
    }
  }
  return null;
}

function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.some(role => hasPermission(userRole, role as UserRole));
}

// Security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://cloudflareinsights.com ${AUTH_GATEWAY_URL} wss: ${process.env.NODE_ENV === 'development' ? 'ws:' : ''}`,
      "frame-ancestors 'none'",
      `form-action 'self' ${AUTH_GATEWAY_URL}`,
      "base-uri 'self'",
      "object-src 'none'",
    ].filter(Boolean).join('; ')
  );

  return response;
}

/**
 * Build Auth Gateway login URL with redirect back to current page.
 */
function getLoginUrl(request: NextRequest): string {
  const appBase = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://mrp.rtrobotics.com';
  const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, appBase).toString();
  const redirectUrl = encodeURIComponent(targetUrl);
  return `${AUTH_GATEWAY_URL}/login?redirect=${redirectUrl}`;
}

// =============================================================================
// SIMPLE RATE LIMITER (In-memory)
// =============================================================================

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 500;

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' ||
         process.env.PLAYWRIGHT_TEST === 'true' ||
         process.env.E2E_TEST === 'true' ||
         process.env.SKIP_RATE_LIMIT === 'true';
}

function checkRateLimit(ip: string): boolean {
  if (isTestEnvironment()) return true;

  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) return false;

  record.count++;
  return true;
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    rateLimitMap.forEach((record, ip) => {
      if (now - record.timestamp > RATE_LIMIT_WINDOW) {
        keysToDelete.push(ip);
      }
    });
    keysToDelete.forEach(ip => rateLimitMap.delete(ip));
  }, RATE_LIMIT_WINDOW);
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  // Preserve existing request ID or generate one (Gate 5.3 requirement)
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  // Create new headers with requestId
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Rate limiting for API routes
  if (isApiRoute(pathname) && !isTestEnvironment() && !checkRateLimit(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('x-request-id', requestId);
    return addSecurityHeaders(response);
  }

  // =========================================================================
  // AUTH: Verify rtr_access_token cookie from RTR Auth Gateway
  // =========================================================================
  const payload = await verifyFromRequest(request);

  if (!payload) {
    // API routes: return 401 JSON with login URL
    if (isApiRoute(pathname)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Unauthorized. Please login.',
          login_url: getLoginUrl(request),
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Web pages: redirect to Auth Gateway login
    return NextResponse.redirect(getLoginUrl(request));
  }

  // Map Gateway JWT to MRP role
  const mrpRole = mapToMrpRole(payload);

  // No MRP access
  if (!mrpRole) {
    if (isApiRoute(pathname)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden. You do not have access to MRP.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Redirect to a "no access" page or home with error
    const homeUrl = new URL('/home', request.url);
    homeUrl.searchParams.set('error', 'no_mrp_access');
    return NextResponse.redirect(homeUrl);
  }

  // Check role-based access for protected routes
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles) {
    if (!hasRole(mrpRole, requiredRoles)) {
      if (isApiRoute(pathname)) {
        return new NextResponse(
          JSON.stringify({
            error: 'Forbidden. You do not have permission to access this resource.'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      const dashboardUrl = new URL('/home', request.url);
      dashboardUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Continue with request
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('x-request-id', requestId);

  // Add user info to request headers for API routes
  if (isApiRoute(pathname)) {
    response.headers.set('x-user-id', payload.sub || '');
    response.headers.set('x-user-role', mrpRole);
  }

  return addSecurityHeaders(response);
}

// =============================================================================
// MIDDLEWARE CONFIG
// =============================================================================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
