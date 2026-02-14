/**
 * Workflow API Routes
 * GET - List workflow definitions and instances
 * POST - Start a new workflow instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { workflowEngine } from '@/lib/workflow';
import { WorkflowEntityType, WorkflowStatus } from '@prisma/client';
import { logger } from '@/lib/logger';

// GET /api/workflows - List workflows
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'definitions' or 'instances'
    const entityType = searchParams.get('entityType') as WorkflowEntityType | null;
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (type === 'definitions') {
      // List workflow definitions
      const definitions = await prisma.workflowDefinition.findMany({
        where: {
          isActive: true,
          ...(entityType ? { entityType } : {}),
        },
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
          _count: {
            select: { instances: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ definitions });
    }

    // List workflow instances
    const where = {
      ...(entityType ? { entityType } : {}),
      ...(status ? { status: status as WorkflowStatus } : {}),
      ...(userId ? { initiatedBy: userId } : {}),
    };

    const [instances, total] = await Promise.all([
      prisma.workflowInstance.findMany({
        where,
        include: {
          workflow: { select: { name: true, code: true } },
          initiatedByUser: { select: { id: true, name: true, email: true } },
          _count: {
            select: { approvals: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workflowInstance.count({ where }),
    ]);

    return NextResponse.json({
      instances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/workflows' });
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Start a new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowCode, entityType, entityId, initiatedBy, contextData } = body;

    if (!workflowCode || !entityType || !entityId || !initiatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: workflowCode, entityType, entityId, initiatedBy' },
        { status: 400 }
      );
    }

    // Validate entity type
    const validEntityTypes = [
      'PURCHASE_ORDER',
      'SALES_ORDER',
      'WORK_ORDER',
      'NCR',
      'CAPA',
      'INVENTORY_ADJUSTMENT',
      'ENGINEERING_CHANGE',
    ];

    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: `Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await workflowEngine.startWorkflow({
      workflowCode,
      entityType: entityType as WorkflowEntityType,
      entityId,
      initiatedBy,
      contextData,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      instanceId: result.instanceId,
      status: result.status,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/workflows' });
    return NextResponse.json(
      { error: 'Failed to start workflow' },
      { status: 500 }
    );
  }
}
