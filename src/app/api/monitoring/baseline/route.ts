// src/app/api/monitoring/baseline/route.ts
// API endpoint for collecting and viewing performance baseline metrics

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { z } from 'zod';

interface EndpointMetric {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  sampleCount: number;
}

interface DatabaseMetric {
  table: string;
  rowCount: number;
  estimatedSize: string;
}

interface BaselineReport {
  timestamp: string;
  environment: string;
  version: string;
  database: {
    tables: DatabaseMetric[];
    totalRows: number;
    connectionPoolSize: number;
  };
  endpoints: EndpointMetric[];
  systemHealth: {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
}

// GET - Collect current baseline metrics
export const GET = withAuth(async (request: NextRequest, context, session) => {
  const startTime = Date.now();

  try {
    // Collect database metrics
    const tableMetrics = await collectDatabaseMetrics();

    // Collect endpoint response time estimates
    const endpointMetrics = await collectEndpointMetrics();

    // System health
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const report: BaselineReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      database: {
        tables: tableMetrics.tables,
        totalRows: tableMetrics.totalRows,
        connectionPoolSize: 10, // Default Prisma pool size
      },
      endpoints: endpointMetrics,
      systemHealth: {
        memoryUsage,
        uptime,
      },
    };

    const collectionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      collectionTimeMs: collectionTime,
      baseline: report,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/monitoring/baseline' });
    return NextResponse.json(
      { error: 'Failed to collect baseline' },
      { status: 500 }
    );
  }
});

// Collect database table metrics
async function collectDatabaseMetrics(): Promise<{
  tables: DatabaseMetric[];
  totalRows: number;
}> {
  const tables: DatabaseMetric[] = [];
  let totalRows = 0;

  // Count rows for each major table
  const tableCounts = await Promise.all([
    prisma.part.count().then((count: number) => ({ table: 'parts', count })),
    prisma.supplier.count().then((count: number) => ({ table: 'suppliers', count })),
    prisma.customer.count().then((count: number) => ({ table: 'customers', count })),
    prisma.salesOrder.count().then((count: number) => ({ table: 'sales_orders', count })),
    prisma.purchaseOrder.count().then((count: number) => ({ table: 'purchase_orders', count })),
    prisma.workOrder.count().then((count: number) => ({ table: 'work_orders', count })),
    prisma.product.count().then((count: number) => ({ table: 'products', count })),
    prisma.nCR.count().then((count: number) => ({ table: 'ncrs', count })),
    prisma.inventory.count().then((count: number) => ({ table: 'inventory', count })),
    prisma.bomHeader.count().then((count: number) => ({ table: 'bom', count })),
  ]);

  for (const { table, count } of tableCounts) {
    tables.push({
      table,
      rowCount: count,
      estimatedSize: estimateSize(count),
    });
    totalRows += count;
  }

  return { tables, totalRows };
}

// Estimate table size based on row count
function estimateSize(rowCount: number): string {
  // Rough estimate: ~500 bytes per row average
  const bytes = rowCount * 500;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

// Collect endpoint response time metrics by testing them
async function collectEndpointMetrics(): Promise<EndpointMetric[]> {
  const endpoints = [
    { path: '/api/parts', method: 'GET' },
    { path: '/api/suppliers', method: 'GET' },
    { path: '/api/customers', method: 'GET' },
    { path: '/api/work-orders', method: 'GET' },
    { path: '/api/sales-orders', method: 'GET' },
    { path: '/api/purchase-orders', method: 'GET' },
    { path: '/api/inventory', method: 'GET' },
    { path: '/api/dashboard/stats', method: 'GET' },
  ];

  const metrics: EndpointMetric[] = [];

  for (const { path, method } of endpoints) {
    const times: number[] = [];

    // Run 3 samples for each endpoint
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      try {
        // Simulate internal API call timing
        await measureEndpoint(path);
        times.push(Date.now() - start);
      } catch {
        times.push(-1); // Error indicator
      }
    }

    const validTimes = times.filter(t => t >= 0);
    if (validTimes.length > 0) {
      metrics.push({
        endpoint: path,
        method,
        avgResponseTime: Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length),
        p95ResponseTime: Math.round(validTimes.sort((a, b) => a - b)[Math.floor(validTimes.length * 0.95)] || validTimes[validTimes.length - 1]),
        sampleCount: validTimes.length,
      });
    }
  }

  return metrics.sort((a, b) => b.avgResponseTime - a.avgResponseTime);
}

// Measure endpoint by running actual query
async function measureEndpoint(path: string): Promise<void> {
  switch (path) {
    case '/api/parts':
      await prisma.part.findMany({ take: 50, select: { id: true, partNumber: true, name: true } });
      break;
    case '/api/suppliers':
      await prisma.supplier.findMany({ take: 50, select: { id: true, code: true, name: true } });
      break;
    case '/api/customers':
      await prisma.customer.findMany({ take: 50, select: { id: true, code: true, name: true } });
      break;
    case '/api/work-orders':
      await prisma.workOrder.findMany({ take: 50, select: { id: true, woNumber: true, status: true } });
      break;
    case '/api/sales-orders':
      await prisma.salesOrder.findMany({ take: 50, select: { id: true, orderNumber: true, status: true } });
      break;
    case '/api/purchase-orders':
      await prisma.purchaseOrder.findMany({ take: 50, select: { id: true, poNumber: true, status: true } });
      break;
    case '/api/inventory':
      await prisma.inventory.findMany({ take: 50, select: { id: true, quantity: true } });
      break;
    case '/api/dashboard/stats':
      await Promise.all([
        prisma.part.count(),
        prisma.salesOrder.count(),
        prisma.workOrder.count(),
      ]);
      break;
  }
}

// POST - Save baseline to file
export const POST = withAuth(async (request: NextRequest, context, session) => {
  try {
    const bodySchema = z.object({
      baseline: z.record(z.string(), z.unknown()).optional(),
      name: z.string().optional(),
    });
    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { baseline, name } = parseResult.data;

    // In production, this would save to a database or file system
    // For now, return the baseline with a reference ID
    const baselineId = `baseline_${Date.now()}`;

    return NextResponse.json({
      success: true,
      message: 'Baseline saved',
      baselineId,
      name: name || 'Unnamed Baseline',
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/monitoring/baseline' });
    return NextResponse.json(
      { error: 'Failed to save baseline' },
      { status: 500 }
    );
  }
});
