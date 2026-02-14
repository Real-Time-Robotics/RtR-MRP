// src/app/api/excel/import/process/route.ts
// Submits import processing to background job queue

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { jobQueue, JOB_NAMES } from "@/lib/jobs/job-queue";
import "@/lib/jobs/handlers"; // Ensure handlers are registered

interface ImportOptions {
  updateMode?: "insert" | "update" | "upsert";
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

// POST - Submit import job to background queue
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, data } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
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

    if (importJob.status === "completed") {
      return NextResponse.json(
        { error: "Import job already completed" },
        { status: 400 }
      );
    }

    // Get mappings and options
    const mappings = (importJob.mapping || []) as unknown as ColumnMapping[];
    const options = (importJob.options || {}) as unknown as ImportOptions;
    const updateMode = options.updateMode || "insert";
    const entityType = importJob.type;

    // Submit to background job queue
    const bgJob = jobQueue.add(
      JOB_NAMES.EXCEL_IMPORT,
      {
        jobId,
        data,
        entityType,
        mappings,
        updateMode,
      },
      1 // priority
    );

    return NextResponse.json({
      success: true,
      backgroundJobId: bgJob.id,
      message: `Import job queued for ${data.length} rows. Poll /api/jobs/${bgJob.id} for progress.`,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "/api/excel/import/process" }
    );
    return NextResponse.json(
      { error: "Import processing failed" },
      { status: 500 }
    );
  }
}
