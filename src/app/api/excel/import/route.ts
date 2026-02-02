// src/app/api/excel/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseFile,
  autoDetectMappings,
  detectEntityType,
} from "@/lib/excel";

// POST - Upload and parse file, create import job
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const useAI = formData.get("useAI") !== "false"; // Default to true

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the file
    const parseResult = parseFile(buffer, file.name);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Failed to parse file", details: parseResult.errors },
        { status: 400 }
      );
    }

    // Get first sheet
    const sheet = parseResult.sheets[0];
    if (!sheet || sheet.data.length === 0) {
      return NextResponse.json(
        { error: "File is empty or has no data" },
        { status: 400 }
      );
    }

    // Detect entity type if not provided
    let detectedType = entityType;
    let entityDetectionResult = null;

    if (!entityType) {
      // Use rule-based detection (now supports Vietnamese)
      const detection = detectEntityType(sheet.headers);
      detectedType = detection.entityType;
      entityDetectionResult = {
        entityType: detection.entityType,
        confidence: detection.confidence,
        matchedHeaders: detection.matchedHeaders,
        source: "rules",
        needsAIConfirmation: detection.confidence < 0.7,
      };
    }

    // Auto-detect mappings
    let mappings = null;
    let mappingResult = null;

    if (detectedType) {
      const detected = autoDetectMappings(sheet.headers, detectedType);
      mappings = detected.mappings;
      mappingResult = {
        mappings: detected.mappings,
        unmappedColumns: detected.unmappedColumns,
        missingRequiredFields: detected.missingRequiredFields,
        hasUnmappedColumns: detected.unmappedColumns.length > 0,
        needsAISuggestions: useAI && detected.unmappedColumns.length > 0,
      };
    }

    // Create import job
    const importJob = await prisma.importJob.create({
      data: {
        userId: session.user.id,
        type: detectedType || "unknown",
        fileName: file.name,
        fileSize: buffer.length,
        status: "pending",
        totalRows: sheet.data.length,
        mapping: mappings as never,
      },
    });

    return NextResponse.json({
      jobId: importJob.id,
      fileName: file.name,
      fileSize: buffer.length,
      sheets: parseResult.sheets.map((s) => ({
        name: s.name,
        rowCount: s.rowCount,
        columnCount: s.columnCount,
        headers: s.headers,
        columns: s.columns,
      })),
      activeSheet: parseResult.activeSheet,
      entityType: detectedType,
      entityDetection: entityDetectionResult,
      mappings,
      mappingResult,
      preview: sheet.data.slice(0, 10),
      // AI enhancement hints
      aiHints: {
        canUseAI: useAI,
        needsEntityConfirmation: entityDetectionResult?.needsAIConfirmation,
        needsMappingSuggestions: mappingResult?.needsAISuggestions,
        aiEndpoint: "/api/excel/import/ai",
      },
    });
  } catch (error) {
    console.error("Import upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

// PUT - Update mapping and validate data
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, mappings, entityType, updateMode } = await request.json();

    if (!jobId || !mappings || !entityType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get import job
    const importJob = await prisma.importJob.findUnique({
      where: { id: jobId, userId: session.user.id },
    });

    if (!importJob) {
      return NextResponse.json(
        { error: "Import job not found" },
        { status: 404 }
      );
    }

    // Update job with mappings
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        type: entityType,
        mapping: mappings,
        options: { updateMode: updateMode || "insert" } as never,
        status: "validating",
      },
    });

    return NextResponse.json({
      success: true,
      jobId,
      status: "validating",
    });
  } catch (error) {
    console.error("Import mapping error:", error);
    return NextResponse.json(
      { error: "Mapping update failed" },
      { status: 500 }
    );
  }
}

// GET - Get import job status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      // Get specific job
      const job = await prisma.importJob.findUnique({
        where: { id: jobId, userId: session.user.id },
      });

      if (!job) {
        return NextResponse.json(
          { error: "Import job not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(job);
    }

    // Get all jobs for user
    const jobs = await prisma.importJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Import status error:", error);
    return NextResponse.json(
      { error: "Failed to get import status" },
      { status: 500 }
    );
  }
}
