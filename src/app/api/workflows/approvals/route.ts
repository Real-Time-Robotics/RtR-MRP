/**
 * Workflow Approvals API Routes
 * GET - List pending approvals for a user
 * POST - Submit approval decision (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/lib/workflow';

// GET /api/workflows/approvals - List pending approvals
export async function GET(request: NextRequest) {
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
    console.error('[API] Pending approvals GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}

// POST /api/workflows/approvals - Submit approval decision
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
        comments,
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
    console.error('[API] Approval POST error:', error);
    return NextResponse.json(
      { error: 'Failed to submit approval' },
      { status: 500 }
    );
  }
}
