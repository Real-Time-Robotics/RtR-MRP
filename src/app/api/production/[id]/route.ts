import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateWorkOrderStatus } from "@/lib/mrp-engine";
import { withAuth, type AuthUser } from "@/lib/auth/middleware";
import { handleError, NotFoundError, paginatedResponse, successResponse } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { WorkOrderUpdateSchema, validateRequest } from "@/lib/validation/schemas";

// GET - Get work order details (requires authentication + permission)
export const GET = withAuth(
  async (
    request: NextRequest,
    { params, user }: { params: { id: string }; user: AuthUser }
  ) => {
    try {
      const { id } = await params;

      logger.info("Fetching work order", { workOrderId: id, userId: user.id });

      const workOrder = await prisma.workOrder.findUnique({
        where: { id },
        include: {
          product: true,
          salesOrder: {
            include: { customer: true },
          },
          allocations: {
            include: { part: true },
          },
        },
      });

      if (!workOrder) {
        throw new NotFoundError("Work order", id);
      }

      logger.audit("read", "workOrder", id, { userId: user.id });

      return successResponse(workOrder);
    } catch (error) {
      return handleError(error);
    }
  },
  { permission: "production:read" }
);

// PATCH - Update work order (requires authentication + write permission)
export const PATCH = withAuth(
  async (
    request: NextRequest,
    { params, user }: { params: { id: string }; user: AuthUser }
  ) => {
    try {
      const { id } = await params;
      const body = await request.json();

      // Validate input
      const validation = validateRequest(WorkOrderUpdateSchema, { ...body, id });
      if (!validation.success) {
        return validation.error;
      }

      const { status, completedQty, ...updateData } = validation.data;

      logger.info("Updating work order", { workOrderId: id, userId: user.id, status });

      let workOrder;

      if (status) {
        workOrder = await updateWorkOrderStatus(id, status, completedQty);
      } else {
        workOrder = await prisma.workOrder.update({
          where: { id },
          data: updateData,
          include: {
            product: true,
            allocations: { include: { part: true } },
          },
        });
      }

      logger.audit("update", "workOrder", id, { userId: user.id, status });

      return successResponse(workOrder);
    } catch (error) {
      return handleError(error);
    }
  },
  { permission: "production:write" }
);

// DELETE - Delete work order (requires admin role)
export const DELETE = withAuth(
  async (
    request: NextRequest,
    { params, user }: { params: { id: string }; user: AuthUser }
  ) => {
    try {
      const { id } = await params;

      logger.warn("Deleting work order", { workOrderId: id, userId: user.id });

      // Check if work order exists
      const existing = await prisma.workOrder.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError("Work order", id);
      }

      // Only allow deletion of DRAFT or CANCELLED orders
      if (!["DRAFT", "CANCELLED"].includes(existing.status)) {
        return NextResponse.json(
          { success: false, error: "Can only delete DRAFT or CANCELLED work orders" },
          { status: 400 }
        );
      }

      await prisma.workOrder.delete({ where: { id } });

      logger.audit("delete", "workOrder", id, { userId: user.id });

      return NextResponse.json({ success: true, message: "Work order deleted" });
    } catch (error) {
      return handleError(error);
    }
  },
  { role: "manager" } // Only managers and above can delete
);
