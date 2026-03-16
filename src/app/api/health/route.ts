import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// =============================================================================
// HEALTH CHECK API - Gate 5.4 Compliant
// Must include DB proof: dbElapsedMs + dbCheckedAt
// =============================================================================

export async function GET() {
  const start = Date.now();
  let dbStatus: 'connected' | 'error' = 'error';
  let dbElapsedMs = 0;

  try {
    // Execute lightweight DB query with 1s timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), 1000)
      )
    ]);

    dbElapsedMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (error) {
    dbElapsedMs = Date.now() - start;
    logger.error('DB check failed', { context: 'GET /api/health', details: error instanceof Error ? error.message : String(error) });
  }

  // Determine overall status
  const status = dbStatus === 'connected' ? 'ok' : 'degraded';

  // Check Redis availability (optional dependency)
  const redisStatus = process.env.UPSTASH_REDIS_REST_URL
    ? 'ok'
    : 'skipped';

  return NextResponse.json({
    status,
    database: dbStatus,
    dbElapsedMs,              // REQUIRED: DB proof
    dbCheckedAt: new Date().toISOString(),  // REQUIRED: DB proof
    redis: redisStatus,
  });
}
