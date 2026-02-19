// =============================================================================
// AUTO-PO QUEUE API - Queue management endpoints
// GET: Get queue items, POST: Add to queue
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { approvalQueueService, QueueFilter, QueueSortOptions, QueueItemStatus, QueuePriority } from '@/lib/ai/autonomous/approval-queue-service';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
const queuePostSchema = z.object({
  suggestion: z.record(z.string(), z.unknown()),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  expiryDays: z.number().int().positive().optional(),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const filter: QueueFilter = {};

    const status = searchParams.get('status');
    if (status) {
      filter.status = status.split(',') as QueueItemStatus[];
    }

    const priority = searchParams.get('priority');
    if (priority) {
      filter.priority = priority.split(',') as QueuePriority[];
    }

    const partIds = searchParams.get('partIds');
    if (partIds) {
      filter.partIds = partIds.split(',');
    }

    const supplierIds = searchParams.get('supplierIds');
    if (supplierIds) {
      filter.supplierIds = supplierIds.split(',');
    }

    const minConfidence = searchParams.get('minConfidence');
    if (minConfidence) {
      filter.minConfidence = parseFloat(minConfidence);
    }

    const maxConfidence = searchParams.get('maxConfidence');
    if (maxConfidence) {
      filter.maxConfidence = parseFloat(maxConfidence);
    }

    const search = searchParams.get('search');
    if (search) {
      filter.search = search;
    }

    const tags = searchParams.get('tags');
    if (tags) {
      filter.tags = tags.split(',');
    }

    // Parse sort parameters
    let sort: QueueSortOptions | undefined;
    const sortField = searchParams.get('sortBy');
    const sortDir = searchParams.get('sortDir');
    if (sortField) {
      sort = {
        field: sortField as QueueSortOptions['field'],
        direction: (sortDir || 'desc') as 'asc' | 'desc',
      };
    }

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Get queue items
    const result = await approvalQueueService.getQueueItems(
      filter,
      sort,
      { page, pageSize }
    );

    // Get stats
    const stats = await approvalQueueService.getQueueStats();

    return NextResponse.json({
      success: true,
      ...result,
      stats,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/auto-po/queue' });
    return NextResponse.json(
      { error: 'Failed to get queue items' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const body = await request.json();
    const parsed = queuePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { suggestion, priority, tags, notes, expiryDays } = parsed.data;

    const queueItem = await approvalQueueService.addToQueue(
      suggestion as unknown as import('@/lib/ai/autonomous/ai-po-analyzer').EnhancedPOSuggestion,
      session.user?.id || 'system',
      {
        priority,
        tags,
        notes: notes ? [notes] : undefined,
        expiryDays,
      }
    );

    return NextResponse.json({
      success: true,
      queueItem,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-po/queue' });
    return NextResponse.json(
      { error: 'Failed to add to queue', details: (error as Error).message },
      { status: 500 }
    );
  }
});

// Get specific queue item
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const body = await request.json();
    const { id, action, note } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Queue item ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'start_review':
        const started = await approvalQueueService.startReview(
          id,
          session.user?.id || 'system'
        );
        return NextResponse.json({ success: started });

      case 'cancel_review':
        const cancelled = await approvalQueueService.cancelReview(
          id,
          session.user?.id || 'system'
        );
        return NextResponse.json({ success: cancelled });

      case 'add_note':
        if (!note) {
          return NextResponse.json(
            { error: 'Note is required' },
            { status: 400 }
          );
        }
        const added = await approvalQueueService.addNote(
          id,
          note,
          session.user?.id || 'system'
        );
        return NextResponse.json({ success: added });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/ai/auto-po/queue' });
    return NextResponse.json(
      { error: 'Failed to update queue item' },
      { status: 500 }
    );
  }
});
