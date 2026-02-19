/**
 * Bulk Workflow Approvals API
 * POST - Submit multiple approval decisions at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { workflowEngine } from '@/lib/workflow';
import { logger } from '@/lib/logger';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
interface BulkApprovalItem {
  instanceId: string;
  decision: 'approve' | 'reject';
  comments?: string;
}

interface BulkApprovalResult {
  instanceId: string;
  success: boolean;
  status?: string;
  error?: string;
}

// POST /api/workflows/approvals/bulk - Submit bulk approval decisions
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      approvals: z.array(z.object({
        instanceId: z.string(),
        decision: z.enum(['approve', 'reject']),
        comments: z.string().optional(),
      })),
      approverId: z.string(),
    });

    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { approvals, approverId } = parseResult.data as {
      approvals: BulkApprovalItem[];
      approverId: string;
    };

    if (!approvals || !Array.isArray(approvals) || approvals.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty approvals array' },
        { status: 400 }
      );
    }

    if (!approverId) {
      return NextResponse.json(
        { error: 'Missing required field: approverId' },
        { status: 400 }
      );
    }

    // Validate all approvals before processing
    for (const approval of approvals) {
      if (!approval.instanceId || !approval.decision) {
        return NextResponse.json(
          { error: 'Each approval must have instanceId and decision' },
          { status: 400 }
        );
      }

      if (!['approve', 'reject'].includes(approval.decision)) {
        return NextResponse.json(
          { error: `Invalid decision for instance ${approval.instanceId}` },
          { status: 400 }
        );
      }

      if (approval.decision === 'reject' && !approval.comments) {
        return NextResponse.json(
          { error: `Comments required for rejection of instance ${approval.instanceId}` },
          { status: 400 }
        );
      }
    }

    // Process all approvals
    const results: BulkApprovalResult[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const approval of approvals) {
      try {
        let result;
        if (approval.decision === 'approve') {
          result = await workflowEngine.approveStep({
            instanceId: approval.instanceId,
            approverId,
            comments: approval.comments,
          });
        } else {
          result = await workflowEngine.rejectStep({
            instanceId: approval.instanceId,
            approverId,
            comments: approval.comments!,
          });
        }

        if (result.success) {
          successCount++;
          results.push({
            instanceId: approval.instanceId,
            success: true,
            status: result.status,
          });
        } else {
          failCount++;
          results.push({
            instanceId: approval.instanceId,
            success: false,
            error: result.error,
          });
        }
      } catch (error) {
        failCount++;
        results.push({
          instanceId: approval.instanceId,
          success: false,
          error: 'Failed to process approval',
        });
      }
    }

    return NextResponse.json({
      success: failCount === 0,
      summary: {
        total: approvals.length,
        successful: successCount,
        failed: failCount,
      },
      results,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/workflows/approvals/bulk' });
    return NextResponse.json(
      { error: 'Failed to process bulk approvals' },
      { status: 500 }
    );
  }
});
