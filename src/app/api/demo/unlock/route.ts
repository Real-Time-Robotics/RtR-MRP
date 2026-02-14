// =============================================================================
// DEMO UNLOCK API - Unlock demo accounts that got locked
// =============================================================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

const DEMO_EMAILS = [
  'admin@demo.rtr-mrp.com',
  'manager@demo.rtr-mrp.com',
  'operator@demo.rtr-mrp.com',
  'viewer@demo.rtr-mrp.com',
];

export async function POST() {
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
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
