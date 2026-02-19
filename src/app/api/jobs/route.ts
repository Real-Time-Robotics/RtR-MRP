// src/app/api/jobs/route.ts
// Background job management API

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { jobQueue, JOB_NAMES } from "@/lib/jobs/job-queue";
import { logger } from '@/lib/logger';
import { z } from "zod";

import "@/lib/jobs/handlers"; // Ensure handlers are registered
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const JobCreateSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  data: z.record(z.string(), z.unknown()).default({}),
  priority: z.number().int().default(0),
});

// GET - List jobs and stats
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let jobs;
    if (status) {
      jobs = jobQueue.getJobsByStatus(status as "pending" | "running" | "completed" | "failed");
    } else {
      jobs = jobQueue.getAllJobs();
    }

    const stats = jobQueue.getStats();

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        status: job.status,
        priority: job.priority,
        attempts: job.attempts,
        progress: job.progress,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        error: job.error,
      })),
      stats,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/jobs' });
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
});

// POST - Create a new job
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const body = await request.json();

    const validation = JobCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, data, priority } = validation.data;

    // Validate job name against registered names
    const validJobNames = Object.values(JOB_NAMES);
    if (!validJobNames.includes(name)) {
      return NextResponse.json(
        {
          error: "Invalid job name",
          validNames: validJobNames,
        },
        { status: 400 }
      );
    }

    const job = jobQueue.add(name, data, priority);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/jobs' });
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
});

// DELETE - Clear old jobs
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { searchParams } = new URL(request.url);
    const hoursOld = parseInt(searchParams.get("hoursOld") || "24");

    const cleared = jobQueue.clear(hoursOld * 60 * 60 * 1000);

    return NextResponse.json({
      success: true,
      cleared,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/jobs' });
    return NextResponse.json(
      { error: "Failed to clear jobs" },
      { status: 500 }
    );
  }
});
