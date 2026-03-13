/**
 * Workflow Instance API Routes
 * GET - Get workflow instance details
 * DELETE - Cancel workflow instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/lib/workflow';
import { logger } from '@/lib/logger';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// GET /api/workflows/[instanceId] - Get instance details
export const GET = withAuth(async (request: NextRequest, context: RouteContext) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { instanceId } = await context.params;

    const instance = await workflowEngine.getWorkflowInstance(instanceId);

    if (!instance) {
      return NextResponse.json(
        { error: 'Workflow instance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ instance });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/workflows/[instanceId]' });
    return NextResponse.json(
      { error: 'Failed to fetch workflow instance' },
      { status: 500 }
    );
  }
});

// DELETE /api/workflows/[instanceId] - Cancel workflow
export const DELETE = withAuth(async (request: NextRequest, context: RouteContext) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { instanceId } = await context.params;
    const body = await request.json();
    const { cancelledBy, reason } = body;

    if (!cancelledBy || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: cancelledBy, reason' },
        { status: 400 }
      );
    }

    const result = await workflowEngine.cancelWorkflow(instanceId, cancelledBy, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/workflows/[instanceId]' });
    return NextResponse.json(
      { error: 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
});
