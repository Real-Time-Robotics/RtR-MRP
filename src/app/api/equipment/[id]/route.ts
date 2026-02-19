import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';

const equipmentPutSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.string().optional(),
  workCenterId: z.string().optional(),
  purchaseDate: z.string().optional(),
  installDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  maintenanceIntervalDays: z.number().int().positive().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
}).passthrough();

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET - Get equipment by ID with full details
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        workCenter: {
          select: { id: true, code: true, name: true, type: true },
        },
        maintenanceSchedules: {
          where: { isActive: true },
          orderBy: { nextDueDate: "asc" },
          take: 5,
        },
        maintenanceOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            type: true,
            status: true,
            priority: true,
            plannedStartDate: true,
            actualStartDate: true,
            actualEndDate: true,
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch equipment" },
      { status: 500 }
    );
  }
});

// PUT - Update equipment
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
    const body = await request.json();
    const parsed = equipmentPutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        ...data,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        installDate: data.installDate ? new Date(data.installDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : undefined,
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : undefined,
      },
      include: {
        workCenter: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment/[id]' });
    return NextResponse.json(
      { error: "Failed to update equipment" },
      { status: 500 }
    );
  }
});

// DELETE - Delete equipment
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

    await prisma.equipment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment/[id]' });
    return NextResponse.json(
      { error: "Failed to delete equipment" },
      { status: 500 }
    );
  }
});

// PATCH - Update OEE metrics
export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
    const body = await request.json();
    const { availability, performance, quality } = body;

    // Calculate OEE = Availability × Performance × Quality
    const currentOee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        availability,
        performance,
        quality,
        currentOee,
        lastOeeUpdate: new Date(),
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/equipment/[id]' });
    return NextResponse.json(
      { error: "Failed to update OEE" },
      { status: 500 }
    );
  }
});
