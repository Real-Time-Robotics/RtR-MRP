// =============================================================================
// RTR MRP - PROMETHEUS METRICS ENDPOINT
// /api/metrics
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/metrics
 * Returns Prometheus-formatted metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Return basic metrics (prom-client not installed by default)
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    const metrics = `# HELP rtr_mrp_up Application is running
# TYPE rtr_mrp_up gauge
rtr_mrp_up 1

# HELP rtr_mrp_info Application info
# TYPE rtr_mrp_info gauge
rtr_mrp_info{version="${process.env.APP_VERSION || '1.0.0'}",env="${process.env.NODE_ENV || 'development'}"} 1

# HELP rtr_mrp_uptime_seconds Application uptime in seconds
# TYPE rtr_mrp_uptime_seconds gauge
rtr_mrp_uptime_seconds ${uptime.toFixed(0)}

# HELP rtr_mrp_memory_heap_used_bytes Heap memory used
# TYPE rtr_mrp_memory_heap_used_bytes gauge
rtr_mrp_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP rtr_mrp_memory_heap_total_bytes Total heap memory
# TYPE rtr_mrp_memory_heap_total_bytes gauge
rtr_mrp_memory_heap_total_bytes ${memUsage.heapTotal}

# HELP rtr_mrp_memory_rss_bytes Resident set size
# TYPE rtr_mrp_memory_rss_bytes gauge
rtr_mrp_memory_rss_bytes ${memUsage.rss}
`;
    
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/metrics' });
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}
