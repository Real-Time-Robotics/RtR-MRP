// =============================================================================
// RTR MRP - NEXT.JS MIDDLEWARE
// Route protection, security headers, rate limiting
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/demo',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
  '/api/metrics',
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
  // Check if it's a static file
  if (staticExtensions.some(ext => pathname.endsWith(ext))) {
    return true;
  }

  // Check public routes
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
  const roleHierarchy: Record<string, number> = {
    admin: 100,
    manager: 80,
    supervisor: 60,
    planner: 50,
    quality: 35,
    operator: 40,
    viewer: 20,
    user: 10,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const minRequiredLevel = Math.min(...requiredRoles.map(r => roleHierarchy[r] || 100));

  return userLevel >= minRequiredLevel;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://api.anthropic.com",
        "frame-ancestors 'none'",
      ].join('; ')
    );
  }

  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

// =============================================================================
// SIMPLE RATE LIMITER (In-memory)
// For production, use Redis-based rate limiting
// =============================================================================

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old entries periodically
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

  // Rate limiting for API routes
  if (isApiRoute(pathname) && !checkRateLimit(ip)) {
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
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Get session token - use correct cookie name for production
  // IMPORTANT: Must use AUTH_SECRET to match NextAuth v5 token signing
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const token = await getToken({
    req: request,
    secret,
    cookieName: isProduction
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token',
  });

  // Redirect to login if not authenticated
  if (!token) {
    // For API routes, return 401
    if (isApiRoute(pathname)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. Please login.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // For web pages, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles) {
    const userRole = (token as { role?: string }).role || 'viewer';

    if (!hasRole(userRole, requiredRoles)) {
      // For API routes, return 403
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

      // For web pages, redirect to dashboard with error
      const dashboardUrl = new URL('/home', request.url);
      dashboardUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Continue with request
  const response = NextResponse.next();

  // Add user info to request headers for API routes
  if (isApiRoute(pathname)) {
    response.headers.set('x-user-id', (token as { id?: string }).id || '');
    response.headers.set('x-user-role', (token as { role?: string }).role || '');
  }

  return addSecurityHeaders(response);
}

// =============================================================================
// MIDDLEWARE CONFIG
// =============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
