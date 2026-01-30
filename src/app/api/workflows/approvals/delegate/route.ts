/**
 * Workflow Delegation API Route
 * POST - Delegate an approval to another user
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowEngine } from '@/lib/workflow';

// POST /api/workflows/approvals/delegate - Delegate approval
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
    console.error('[API] Delegation POST error:', error);
    return NextResponse.json(
      { error: 'Failed to delegate approval' },
      { status: 500 }
    );
  }
}
