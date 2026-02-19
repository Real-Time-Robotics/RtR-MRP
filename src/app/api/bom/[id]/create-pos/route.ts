import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  withPermission,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api/with-permission";
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

// =============================================================================
// VALIDATION
// =============================================================================

const createPOsSchema = z.object({
  shortageItems: z
    .array(
      z.object({
        partId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "At least one shortage item is required"),
});

// =============================================================================
// POST - Create draft POs from BOM explosion shortages
// =============================================================================

async function postHandler(
  request: NextRequest,
  { user }: { params?: Record<string, string>; user: unknown }
) {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const validation = createPOsSchema.safeParse(body);
  if (!validation.success) {
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach((err) => {
      const path = err.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  const { shortageItems } = validation.data;

  // Look up preferred suppliers for each part
  const partIds = shortageItems.map((item) => item.partId);
  const partSuppliers = await prisma.partSupplier.findMany({
    where: {
      partId: { in: partIds },
      status: "active",
    },
    include: {
      supplier: { select: { id: true, code: true, name: true } },
      part: { select: { id: true, partNumber: true, name: true } },
    },
    orderBy: [{ isPreferred: "desc" }, { unitPrice: "asc" }],
  });

  // For each part, pick the best supplier (preferred first, then cheapest)
  const partToSupplier = new Map<
    string,
    (typeof partSuppliers)[number]
  >();
  const unmatched: { id: string; partNumber: string; name: string }[] = [];

  for (const item of shortageItems) {
    const suppliers = partSuppliers.filter(
      (ps) => ps.partId === item.partId
    );
    if (suppliers.length === 0) {
      // Try to get part info for unmatched report
      const part = await prisma.part.findUnique({
        where: { id: item.partId },
        select: { id: true, partNumber: true, name: true },
      });
      if (part) {
        unmatched.push(part);
      }
    } else {
      // Already sorted: preferred first, then cheapest
      partToSupplier.set(item.partId, suppliers[0]);
    }
  }

  // Group shortage items by supplier
  const supplierGroups = new Map<
    string,
    {
      supplier: { id: string; code: string; name: string };
      items: {
        partId: string;
        quantity: number;
        unitPrice: number;
        leadTimeDays: number;
      }[];
    }
  >();

  for (const item of shortageItems) {
    const ps = partToSupplier.get(item.partId);
    if (!ps) continue;

    const supplierId = ps.supplierId;
    if (!supplierGroups.has(supplierId)) {
      supplierGroups.set(supplierId, {
        supplier: ps.supplier,
        items: [],
      });
    }
    supplierGroups.get(supplierId)!.items.push({
      partId: item.partId,
      quantity: item.quantity,
      unitPrice: ps.unitPrice,
      leadTimeDays: ps.leadTimeDays,
    });
  }

  if (supplierGroups.size === 0) {
    return errorResponse(
      "No suppliers found for any shortage items",
      400
    );
  }

  // Auto-generate PO numbers
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const lastPO = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: "desc" },
  });
  let nextSeq =
    (lastPO ? parseInt(lastPO.poNumber.replace(prefix, "")) || 0 : 0) + 1;

  // Create one draft PO per supplier
  const createdPOs = [];
  const now = new Date();

  for (const [, group] of supplierGroups) {
    const poNumber = `${prefix}${String(nextSeq).padStart(3, "0")}`;
    nextSeq++;

    // Use the max lead time from all items for expected date
    const maxLeadTime = Math.max(...group.items.map((i) => i.leadTimeDays));
    const expectedDate = new Date(now);
    expectedDate.setDate(expectedDate.getDate() + maxLeadTime);

    const totalAmount = group.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: group.supplier.id,
        orderDate: now,
        expectedDate,
        status: "draft",
        totalAmount,
        currency: "USD",
        notes: `Auto-created from BOM explosion`,
        lines: {
          create: group.items.map((item, index) => ({
            lineNumber: index + 1,
            partId: item.partId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, code: true, name: true } },
        lines: {
          include: {
            part: { select: { id: true, partNumber: true, name: true } },
          },
        },
      },
    });

    createdPOs.push(po);
  }

  return successResponse({
    created: createdPOs,
    unmatched,
    summary: {
      totalPOs: createdPOs.length,
      totalLines: createdPOs.reduce((sum, po) => sum + po.lines.length, 0),
      totalAmount: createdPOs.reduce(
        (sum, po) => sum + (po.totalAmount || 0),
        0
      ),
      unmatchedCount: unmatched.length,
    },
  }, 201);
}

export const POST = withPermission(postHandler, {
  create: "purchasing:create",
});
