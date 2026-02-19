/**
 * Workflow Approvals API Routes
 * GET - List pending approvals for a user
 * POST - Submit approval decision (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { workflowEngine } from '@/lib/workflow';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET /api/workflows/approvals - List pending approvals
export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const approvals = await workflowEngine.getPendingApprovals(userId);

    return NextResponse.json({
      approvals,
      count: approvals.length,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/workflows/approvals' });
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
});

// POST /api/workflows/approvals - Submit approval decision
export const POST = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      instanceId: z.string(),
      approverId: z.string(),
      decision: z.string(),
      comments: z.string().optional(),
    });

    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { instanceId, approverId, decision, comments } = body;

    if (!instanceId || !approverId || !decision) {
      return NextResponse.json(
        { error: 'Missing required fields: instanceId, approverId, decision' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decision must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Reject requires comments
    if (decision === 'reject' && !comments) {
      return NextResponse.json(
        { error: 'Comments are required when rejecting' },
        { status: 400 }
      );
    }

    let result;
    if (decision === 'approve') {
      result = await workflowEngine.approveStep({
        instanceId,
        approverId,
        comments,
      });
    } else {
      result = await workflowEngine.rejectStep({
        instanceId,
        approverId,
        comments: comments!,
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/workflows/approvals' });
    return NextResponse.json(
      { error: 'Failed to submit approval' },
      { status: 500 }
    );
  }
});
