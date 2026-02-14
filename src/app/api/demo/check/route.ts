// =============================================================================
// DEMO DIAGNOSTIC API - Check demo users and auth configuration
// =============================================================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

const DEMO_USERS = [
  { email: 'admin@demo.rtr-mrp.com', password: 'Admin@Demo2026!', role: 'admin' },
  { email: 'manager@demo.rtr-mrp.com', password: 'Manager@Demo2026!', role: 'manager' },
  { email: 'operator@demo.rtr-mrp.com', password: 'Operator@Demo2026!', role: 'operator' },
  { email: 'viewer@demo.rtr-mrp.com', password: 'Viewer@Demo2026!', role: 'viewer' },
];

export async function GET() {
  try {
    const results = [];

    for (const demoUser of DEMO_USERS) {
      const user = await prisma.user.findUnique({
        where: { email: demoUser.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          password: true,
          failedLoginCount: true,
          lockedUntil: true,
          createdAt: true,
        },
      });

      if (!user) {
        results.push({
          email: demoUser.email,
          exists: false,
          expectedRole: demoUser.role,
        });
      } else {
        // Test password
        const passwordMatch = user.password
          ? await bcrypt.compare(demoUser.password, user.password)
          : false;

        const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();

        results.push({
          email: user.email,
          exists: true,
          id: user.id,
          name: user.name,
          role: user.role,
          expectedRole: demoUser.role,
          roleMatch: user.role === demoUser.role,
          status: user.status,
          statusOk: user.status === 'active',
          hasPassword: !!user.password,
          passwordMatch,
          failedLoginCount: user.failedLoginCount,
          isLocked,
          lockedUntil: user.lockedUntil,
          createdAt: user.createdAt,
        });
      }
    }

    const envCheck = {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      authSecretLength: process.env.AUTH_SECRET?.length || 0,
      nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    };

    const allUsersExist = results.every((r) => r.exists);
    const allPasswordsMatch = results.every((r) => r.exists && r.passwordMatch);
    const allStatusOk = results.every((r) => r.exists && r.statusOk);
    const anyLocked = results.some((r) => r.exists && r.isLocked);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        allUsersExist,
        allPasswordsMatch,
        allStatusOk,
        anyLocked,
        totalUsers: results.length,
        existingUsers: results.filter((r) => r.exists).length,
      },
      environment: envCheck,
      users: results,
      recommendation: !allUsersExist
        ? 'Run: npx prisma db seed'
        : !allPasswordsMatch
        ? 'Passwords do not match - re-run seed'
        : !allStatusOk
        ? 'Some accounts are inactive'
        : anyLocked
        ? 'Some accounts are locked - wait 15 minutes or reset'
        : 'All checks passed - check AUTH_SECRET configuration',
    });
  } catch (error) {
    logger.error('Demo check error', { context: 'GET /api/demo/check', details: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.stack : undefined)
          : undefined,
      },
      { status: 500 }
    );
  }
}
