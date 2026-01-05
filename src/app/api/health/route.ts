// =============================================================================
// RTR MRP - HEALTH CHECK ENDPOINT
// Used by Render.com to verify application health
// =============================================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Lazy import prisma to avoid build errors
let prismaClient: any = null;
const getPrisma = async () => {
  if (!prismaClient) {
    try {
      const { prisma } = await import('@/lib/prisma');
      prismaClient = prisma;
    } catch {
      prismaClient = null;
    }
  }
  return prismaClient;
};

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    memory: 'ok' | 'warning' | 'critical';
  };
  details?: {
    database?: string;
    memory?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: 'ok',
      memory: 'ok',
    },
    details: {},
  };

  // Check database connection
  try {
    const prisma = await getPrisma();
    if (prisma) {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'ok';
      health.details!.database = 'Connected';
    } else {
      health.checks.database = 'error';
      health.details!.database = 'Prisma client not available';
    }
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'unhealthy';
    health.details!.database = error instanceof Error ? error.message : 'Connection failed';
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  health.details!.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    percentage: Math.round(memPercentage),
  };

  if (memPercentage > 90) {
    health.checks.memory = 'critical';
    health.status = 'degraded';
  } else if (memPercentage > 75) {
    health.checks.memory = 'warning';
  }

  // Response time
  const responseTime = Date.now() - startTime;

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  return NextResponse.json({
    ...health,
    responseTime: `${responseTime}ms`,
  }, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
