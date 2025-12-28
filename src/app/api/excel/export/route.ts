// src/app/api/excel/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  exportToExcelBuffer,
  exportToCSVBuffer,
  defaultColumnDefinitions,
  type ExportColumn,
} from "@/lib/excel";

// POST - Create export job and generate file
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      format = "xlsx",
      filters = {},
      columns,
      options = {},
    } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Export type is required" },
        { status: 400 }
      );
    }

    // Fetch data based on type
    const data = await fetchExportData(type, filters);

    if (data.length === 0) {
      return NextResponse.json(
        { error: "No data to export" },
        { status: 400 }
      );
    }

    // Get column definitions
    const columnDefs: ExportColumn[] = columns || defaultColumnDefinitions[type] || [];

    // Generate export
    const result =
      format === "csv"
        ? exportToCSVBuffer(data, columnDefs, options)
        : exportToExcelBuffer(data, columnDefs, options);

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { error: result.error || "Export failed" },
        { status: 500 }
      );
    }

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `${type}_export_${timestamp}.${format}`;

    // Create export job record
    const exportJob = await prisma.exportJob.create({
      data: {
        userId: session.user.id,
        type,
        format,
        filters: filters as never,
        columns: columnDefs as never,
        options: options as never,
        status: "completed",
        fileName,
        fileSize: result.buffer.length,
        totalRecords: data.length,
        exportedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Return file as response
    const headers = new Headers();
    headers.set(
      "Content-Type",
      format === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    headers.set("X-Export-Job-Id", exportJob.id);
    headers.set("X-Total-Records", String(data.length));

    // Convert Buffer to Uint8Array for Response
    const responseBody = new Uint8Array(result.buffer);
    return new NextResponse(responseBody, { headers });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}

// GET - Get export history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const job = await prisma.exportJob.findUnique({
        where: { id: jobId, userId: session.user.id },
      });

      if (!job) {
        return NextResponse.json(
          { error: "Export job not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(job);
    }

    // Get export history
    const jobs = await prisma.exportJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Export history error:", error);
    return NextResponse.json(
      { error: "Failed to get export history" },
      { status: 500 }
    );
  }
}

// Fetch data for export based on type
async function fetchExportData(
  type: string,
  filters: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const where = buildWhereClause(filters);

  switch (type) {
    case "parts":
      return prisma.part.findMany({
        where,
        orderBy: { partNumber: "asc" },
      });

    case "suppliers":
      return prisma.supplier.findMany({
        where,
        orderBy: { code: "asc" },
      });

    case "products":
      return prisma.product.findMany({
        where,
        orderBy: { sku: "asc" },
      });

    case "customers":
      return prisma.customer.findMany({
        where,
        orderBy: { code: "asc" },
      });

    case "inventory":
      return prisma.inventory.findMany({
        where,
        include: {
          part: { select: { partNumber: true, name: true } },
          warehouse: { select: { code: true, name: true } },
        },
        orderBy: { partId: "asc" },
      });

    case "salesOrders":
      return prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { code: true, name: true } },
          lines: { include: { product: true } },
        },
        orderBy: { orderDate: "desc" },
      });

    case "purchaseOrders":
      return prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { code: true, name: true } },
          lines: { include: { part: true } },
        },
        orderBy: { orderDate: "desc" },
      });

    case "workOrders":
      return prisma.workOrder.findMany({
        where,
        include: {
          product: { select: { sku: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

    default:
      return [];
  }
}

// Build Prisma where clause from filters
function buildWhereClause(filters: Record<string, unknown>): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: String(filters.search), mode: "insensitive" } },
    ];
  }

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) {
      (where.createdAt as Record<string, unknown>).gte = new Date(String(filters.fromDate));
    }
    if (filters.toDate) {
      (where.createdAt as Record<string, unknown>).lte = new Date(String(filters.toDate));
    }
  }

  return where;
}
