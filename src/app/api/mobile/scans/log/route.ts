// Mobile API - Scan Logging
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      barcodeValue,
      barcodeType,
      scanContext,
      actionTaken,
      resolvedType,
      resolvedId,
      deviceId,
      deviceType,
      latitude,
      longitude,
    } = body;

    if (!barcodeValue) {
      return NextResponse.json(
        { error: "barcodeValue is required" },
        { status: 400 }
      );
    }

    const scanLog = await prisma.scanLog.create({
      data: {
        barcodeValue,
        barcodeType: barcodeType || "UNKNOWN",
        scanContext: scanContext || "LOOKUP",
        actionTaken: actionTaken || "VIEW",
        resolvedType,
        resolvedId,
        deviceId,
        deviceType,
        scannedBy: session.user.id,
        latitude,
        longitude,
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
    console.error("Mobile scan log API error:", error);
    return NextResponse.json(
      { error: "Failed to log scan" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
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
    console.error("Mobile scan log GET API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scans" },
      { status: 500 }
    );
  }
}
