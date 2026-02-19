/**
 * Workflow Delegation API Route
 * POST - Delegate an approval to another user
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { workflowEngine } from '@/lib/workflow';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
// POST /api/workflows/approvals/delegate - Delegate approval
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      approvalId: z.string(),
      delegatedBy: z.string(),
      delegateTo: z.string(),
      reason: z.string(),
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
    const { approvalId, delegatedBy, delegateTo, reason } = body;

    if (!approvalId || !delegatedBy || !delegateTo || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: approvalId, delegatedBy, delegateTo, reason' },
        { status: 400 }
      );
    }

    const result = await workflowEngine.delegateApproval({
      approvalId,
      delegatedBy,
      delegateTo,
      reason,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      instanceId: result.instanceId,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/workflows/approvals/delegate' });
    return NextResponse.json(
      { error: 'Failed to delegate approval' },
      { status: 500 }
    );
  }
});
