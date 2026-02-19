// src/app/api/excel/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";import { logger } from '@/lib/logger';

import {
  parseFile,
  autoDetectMappings,
  detectEntityType,
} from "@/lib/excel";

import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';
// POST - Upload and parse file, create import job
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const useAI = formData.get("useAI") !== "false"; // Default to true

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File quá lớn. Tối đa ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: `Chỉ chấp nhận file ${allowedExtensions.join(', ')}` },
        { status: 400 }
      );
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/excel/import' });
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
});

// PUT - Update mapping and validate data
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const putBodySchema = z.object({
      jobId: z.string(),
      mappings: z.unknown(),
      entityType: z.string(),
      updateMode: z.string().optional(),
    });

    const rawBody = await request.json();
    const parseResult = putBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { jobId, mappings, entityType, updateMode } = parseResult.data;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/excel/import' });
    return NextResponse.json(
      { error: "Mapping update failed" },
      { status: 500 }
    );
  }
});

// GET - Get import job status
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/excel/import' });
    return NextResponse.json(
      { error: "Failed to get import status" },
      { status: 500 }
    );
  }
});
