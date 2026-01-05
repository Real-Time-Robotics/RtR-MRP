import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// =============================================================================
// HEALTH CHECK API
// For load testing and monitoring
// =============================================================================

export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      database: 'connected',
      responseTime: `${responseTime}ms`,
      uptime: process.uptime(),
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}
