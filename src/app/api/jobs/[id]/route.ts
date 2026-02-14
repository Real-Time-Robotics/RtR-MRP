// src/app/api/jobs/[id]/route.ts
// Single job status + cancel endpoint

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jobQueue } from "@/lib/jobs/job-queue";
import { logger } from "@/lib/logger";

import "@/lib/jobs/handlers"; // Ensure handlers are registered

// GET - Get single job status (used for polling)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = jobQueue.getJob(params.id);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: job.id,
      name: job.name,
      status: job.status,
      progress: job.progress ?? 0,
      attempts: job.attempts,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      error: job.error ?? null,
      result: job.status === "completed" ? job.result : null,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/jobs/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a pending job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cancelled = jobQueue.cancel(params.id);

    if (!cancelled) {
      return NextResponse.json(
        { error: "Job not found or cannot be cancelled (only pending jobs can be cancelled)" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "DELETE /api/jobs/[id]" }
    );
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
