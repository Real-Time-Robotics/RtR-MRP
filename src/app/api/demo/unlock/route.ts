// =============================================================================
// DEMO UNLOCK API - Unlock demo accounts that got locked
// GATED: Only available when NEXT_PUBLIC_DEMO_MODE=true or NODE_ENV !== 'production'
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const isDemoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';

const DEMO_EMAILS = [
  'admin@demo.rtr-mrp.com',
  'manager@demo.rtr-mrp.com',
  'operator@demo.rtr-mrp.com',
  'viewer@demo.rtr-mrp.com',
];

export const POST = withAuth(async (request, context, session) => {
  // Environment gate check
  if (!isDemoEnabled) {
    return NextResponse.json(
      { success: false, error: 'Demo endpoints are disabled in production.' },
      { status: 403 }
    );
  }

  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const results = [];

    for (const email of DEMO_EMAILS) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, failedLoginCount: true, lockedUntil: true },
      });

      if (!user) {
        results.push({ email, action: 'not_found' });
        continue;
      }

      const wasLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
      const hadFailedAttempts = (user.failedLoginCount || 0) > 0;

      if (wasLocked || hadFailedAttempts) {
        await prisma.user.update({
          where: { email },
          data: {
            failedLoginCount: 0,
            lockedUntil: null,
            status: 'active',
          },
        });
        results.push({
          email,
          action: 'unlocked',
          wasLocked,
          previousFailedAttempts: user.failedLoginCount,
        });
      } else {
        results.push({ email, action: 'already_ok' });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Demo accounts have been unlocked',
      results,
    });
  } catch (error) {
    logger.error('Demo unlock error', { context: 'POST /api/demo/unlock', details: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to unlock demo accounts',
      },
      { status: 500 }
    );
  }
});
