/**
 * Workflow Instance API Routes
 * GET - Get workflow instance details
 * DELETE - Cancel workflow instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/lib/workflow';

interface RouteParams {
  params: Promise<{ instanceId: string }>;
}

// GET /api/workflows/[instanceId] - Get instance details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { instanceId } = await params;

    const instance = await workflowEngine.getWorkflowInstance(instanceId);

    if (!instance) {
      return NextResponse.json(
        { error: 'Workflow instance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ instance });
  } catch (error) {
    console.error('[API] Workflow instance GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow instance' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[instanceId] - Cancel workflow
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { instanceId } = await params;
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
    console.error('[API] Workflow cancel error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
}
