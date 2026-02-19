// =============================================================================
// DEMO DIAGNOSTIC API - Check demo users and auth configuration
// =============================================================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

const DEMO_USERS = [
  { email: 'admin@demo.rtr-mrp.com', role: 'admin' },
  { email: 'manager@demo.rtr-mrp.com', role: 'manager' },
  { email: 'operator@demo.rtr-mrp.com', role: 'operator' },
  { email: 'viewer@demo.rtr-mrp.com', role: 'viewer' },
];

export async function GET() {
  try {
    // Require authentication to access diagnostic endpoint
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Batch query: single findMany instead of N serial queries
    const demoEmails = DEMO_USERS.map(u => u.email);
    const users = await prisma.user.findMany({
      where: { email: { in: demoEmails } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        failedLoginCount: true,
        lockedUntil: true,
        createdAt: true,
      },
    });
    const userMap = new Map(users.map(u => [u.email, u]));

    const results = DEMO_USERS.map(demoUser => {
      const user = userMap.get(demoUser.email);
      if (!user) {
        return {
          email: demoUser.email,
          exists: false,
          expectedRole: demoUser.role,
        };
      }
      const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
      return {
        email: user.email,
        exists: true,
        role: user.role,
        expectedRole: demoUser.role,
        roleMatch: user.role === demoUser.role,
        status: user.status,
        statusOk: user.status === 'active',
        failedLoginCount: user.failedLoginCount,
        isLocked,
        createdAt: user.createdAt,
      };
    });

    const envCheck = {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
    };

    const allUsersExist = results.every((r) => r.exists);
    const allStatusOk = results.every((r) => r.exists && r.statusOk);
    const anyLocked = results.some((r) => r.exists && r.isLocked);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        allUsersExist,
        allStatusOk,
        anyLocked,
        totalUsers: results.length,
        existingUsers: results.filter((r) => r.exists).length,
      },
      users: results,
      recommendation: !allUsersExist
        ? 'Run: npx prisma db seed'
        : !allStatusOk
        ? 'Some accounts are inactive'
        : anyLocked
        ? 'Some accounts are locked - wait 15 minutes or reset'
        : 'All checks passed',
    });
  } catch (error) {
    logger.error('Demo check error', { context: 'GET /api/demo/check', details: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check demo status',
      },
      { status: 500 }
    );
  }
}
