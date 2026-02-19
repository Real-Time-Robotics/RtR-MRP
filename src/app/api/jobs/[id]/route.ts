// src/app/api/jobs/[id]/route.ts
// Single job status + cancel endpoint

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { jobQueue } from "@/lib/jobs/job-queue";
import { logger } from "@/lib/logger";

import "@/lib/jobs/handlers"; // Ensure handlers are registered
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// GET - Get single job status (used for polling)
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
const job = jobQueue.getJob(id);

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
});

// DELETE - Cancel a pending job
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
const cancelled = jobQueue.cancel(id);

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
});
