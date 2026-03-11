import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signIn } from '@/lib/auth';

import { checkSigninLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
/**
 * SSO Callback Route
 *
 * Flow:
 * 1. Middleware detects Supabase cookie + no NextAuth session → redirects here
 * 2. This route extracts the Supabase access token from the cookie
 * 3. Calls NextAuth signIn('supabase-sso') with the token
 * 4. NextAuth validates + syncs user → creates JWT session
 * 5. Redirects to the original page
 */
export async function GET(request: NextRequest) {
    // Rate limiting
    const rateLimitResult = await checkSigninLimit(request);
    if (rateLimitResult) return rateLimitResult;

  if (process.env.ENABLE_SUPABASE_SSO !== 'true') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/home';

  try {
    // Find the Supabase auth cookie
    const sbCookie = Array.from(request.cookies.getAll()).find(c =>
      c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    if (!sbCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Parse the cookie value - Supabase stores JSON with access_token
    let accessToken: string;
    try {
      // Cookie can be base64-encoded JSON or direct JSON
      let cookieValue = sbCookie.value;
      // Try base64 decode first
      try {
        cookieValue = Buffer.from(cookieValue, 'base64').toString('utf-8');
      } catch {
        // Not base64, use raw value
      }
      const parsed = JSON.parse(cookieValue);
      accessToken = parsed.access_token || parsed[0]?.access_token;
    } catch {
      // If not JSON, the value itself might be the token
      accessToken = sbCookie.value;
    }

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Use NextAuth signIn with the supabase-sso provider
    await signIn('supabase-sso', {
      accessToken,
      redirect: false,
    });

    return NextResponse.redirect(new URL(callbackUrl, request.url));
  } catch (error) {
    logger.error('[SSO] Callback error:', { error: String(error) });
    return NextResponse.redirect(new URL('/login?error=sso_failed', request.url));
  }
}
