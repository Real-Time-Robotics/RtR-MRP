import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { sendToSubcontractor, receiveFromSubcontractor, getPendingSubcontractShipments, getSubcontractingSummary } from "@/lib/manufacturing/subcontracting-service";
import { z } from "zod";
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

const SubcontractSendItemSchema = z.object({
  partId: z.string().min(1, "Part ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  lotNumber: z.string().optional(),
});

const SubcontractSendSchema = z.object({
  action: z.literal("send").optional(),
  supplierId: z.string().min(1, "Supplier ID is required"),
  items: z.array(SubcontractSendItemSchema).min(1, "At least one item is required"),
  purchaseOrderId: z.string().optional(),
  workOrderId: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  notes: z.string().optional(),
});

const SubcontractReceiveItemSchema = z.object({
  partId: z.string().min(1, "Part ID is required"),
  receivedQty: z.number().int().min(1, "Received quantity must be at least 1"),
  lotNumber: z.string().optional(),
  inspectionRequired: z.boolean().optional(),
});

const SubcontractReceiveSchema = z.object({
  action: z.literal("receive"),
  shipmentRef: z.string().min(1, "Shipment reference is required"),
  supplierId: z.string().min(1, "Supplier ID is required"),
  items: z.array(SubcontractReceiveItemSchema).min(1, "At least one item is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  notes: z.string().optional(),
});

const SubcontractBodySchema = z.union([SubcontractReceiveSchema, SubcontractSendSchema]);

export const GET = withAuth(async (request, context, session) => {
  try {

    const [pending, summary] = await Promise.all([
      getPendingSubcontractShipments(),
      getSubcontractingSummary(),
    ]);
    return NextResponse.json({ data: pending, summary });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch subcontracting data" }, { status: 500 });
  }
});

export const POST = withAuth(async (request, context, session) => {
  try {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();

    const validation = SubcontractBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const userId = session.user?.id || "system";

    if (data.action === "receive") {
      const result = await receiveFromSubcontractor({ ...data, userId });
      return NextResponse.json(result);
    }

    const sendInput = {
      ...data,
      userId,
      expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : undefined,
    };
    const result = await sendToSubcontractor(sendInput);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to process subcontracting" }, { status: 500 });
  }
});
