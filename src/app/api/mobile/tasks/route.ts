// Mobile API - Tasks (Pick Lists, Receiving, etc.)
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // picking, receiving, work_order
    const status = searchParams.get("status");
    const assignedToMe = searchParams.get("assignedToMe") === "true";

    const tasks: Array<{
      id: string;
      type: string;
      reference: string;
      description: string;
      status: string;
      priority: string;
      dueDate?: string;
      assignedTo?: string;
      items: number;
      completedItems: number;
    }> = [];

    // Get pick lists
    if (!type || type === "picking") {
      const pickLists = await prisma.pickList.findMany({
        where: {
          ...(status && status !== "all" ? { status } : {}),
          ...(assignedToMe ? { assignedTo: session.user.id } : {}),
        },
        include: {
          lines: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      for (const pl of pickLists) {
        const completedLines = pl.lines.filter(
          (l) => Number(l.pickedQty) >= Number(l.requestedQty)
        ).length;
        tasks.push({
          id: pl.id,
          type: "picking",
          reference: pl.pickListNumber,
          description: `${pl.sourceType} Pick List`,
          status: pl.status === "PENDING" ? "pending" : pl.status === "IN_PROGRESS" ? "in_progress" : "completed",
          priority: pl.priority <= 3 ? "high" : pl.priority <= 6 ? "medium" : "low",
          dueDate: pl.dueDate?.toISOString().split("T")[0],
          assignedTo: pl.assignedTo || undefined,
          items: pl.lines.length,
          completedItems: completedLines,
        });
      }
    }

    // Get receiving tasks (from purchase orders awaiting receipt)
    if (!type || type === "receiving") {
      const pendingPOs = await prisma.purchaseOrder.findMany({
        where: {
          status: { in: ["APPROVED", "PARTIALLY_RECEIVED"] },
        },
        include: {
          supplier: true,
          lines: true,
        },
        orderBy: { expectedDate: "asc" },
        take: 20,
      });

      for (const po of pendingPOs) {
        const receivedLines = po.lines.filter(
          (l) => l.receivedQty >= l.quantity
        ).length;
        tasks.push({
          id: po.id,
          type: "receiving",
          reference: po.poNumber,
          description: `${po.supplier.name}`,
          status: po.status === "PARTIALLY_RECEIVED" ? "in_progress" : "pending",
          priority: "medium",
          dueDate: po.expectedDate?.toISOString().split("T")[0],
          items: po.lines.length,
          completedItems: receivedLines,
        });
      }
    }

    // Get work order tasks
    if (!type || type === "work_order") {
      const activeWOs = await prisma.workOrder.findMany({
        where: {
          status: { in: ["released", "in_progress"] },
        },
        include: {
          product: true,
        },
        orderBy: [{ priority: "desc" }, { plannedStart: "asc" }],
        take: 20,
      });

      for (const wo of activeWOs) {
        tasks.push({
          id: wo.id,
          type: "work_order",
          reference: wo.woNumber,
          description: wo.product.name,
          status: wo.status === "in_progress" ? "in_progress" : "pending",
          priority: wo.priority?.toLowerCase() || "medium",
          dueDate: wo.plannedEnd?.toISOString().split("T")[0],
          items: wo.quantity,
          completedItems: wo.completedQty,
        });
      }
    }

    // Sort by status and priority
    tasks.sort((a, b) => {
      const statusOrder = { in_progress: 0, pending: 1, completed: 2 };
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 2) -
                         (statusOrder[b.status as keyof typeof statusOrder] || 2);
      if (statusDiff !== 0) return statusDiff;

      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/tasks' });
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
});
