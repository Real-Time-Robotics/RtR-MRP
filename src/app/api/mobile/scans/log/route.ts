// Mobile API - Scan Logging
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';
import { z } from "zod";

import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';
const ScanLogSchema = z.object({
  barcodeValue: z.string().min(1, "Barcode value is required"),
  barcodeType: z.string().default("UNKNOWN"),
  scanContext: z.string().default("LOOKUP"),
  actionTaken: z.string().default("VIEW"),
  resolvedType: z.string().optional(),
  resolvedId: z.string().optional(),
  deviceId: z.string().optional(),
  deviceType: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const body = await request.json();

    const validation = ScanLogSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const scanLog = await prisma.scanLog.create({
      data: {
        barcodeValue: data.barcodeValue,
        barcodeType: data.barcodeType,
        scanContext: data.scanContext,
        actionTaken: data.actionTaken,
        resolvedType: data.resolvedType,
        resolvedId: data.resolvedId,
        deviceId: data.deviceId,
        deviceType: data.deviceType,
        scannedBy: session.user.id,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    return NextResponse.json({
      success: true,
      scanLog: {
        id: scanLog.id,
        scannedAt: scanLog.scannedAt,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/scans/log' });
    return NextResponse.json(
      { error: "Failed to log scan" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100);
    const userId = searchParams.get("userId");

    const scans = await prisma.scanLog.findMany({
      where: {
        scannedBy: userId || session.user.id,
      },
      orderBy: { scannedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      scans: scans.map((scan) => ({
        id: scan.id,
        barcodeValue: scan.barcodeValue,
        barcodeType: scan.barcodeType,
        scanContext: scan.scanContext,
        actionTaken: scan.actionTaken,
        resolvedType: scan.resolvedType,
        resolvedId: scan.resolvedId,
        scannedAt: scan.scannedAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/scans/log' });
    return NextResponse.json(
      { error: "Failed to fetch scans" },
      { status: 500 }
    );
  }
});
