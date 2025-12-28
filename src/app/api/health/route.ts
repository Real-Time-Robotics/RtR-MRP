// src/app/api/health/route.ts
// Health check endpoint for RTR MRP System

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/cache/redis";

interface HealthCheck {
  status: "pass" | "fail";
  latency?: number;
  message?: string;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
  };
}

const startTime = Date.now();

export async function GET() {
  const checks: HealthStatus["checks"] = {
    database: { status: "fail" },
    cache: { status: "fail" },
  };

  // Check database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "pass",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "fail",
      message:
        error instanceof Error ? error.message : "Database connection failed",
    };
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    const pong = await redis.ping();
    if (pong === "PONG") {
      checks.cache = {
        status: "pass",
        latency: Date.now() - redisStart,
      };
    } else {
      checks.cache = {
        status: "fail",
        message: "Redis ping failed",
      };
    }
  } catch (error) {
    checks.cache = {
      status: "fail",
      message:
        error instanceof Error ? error.message : "Redis connection failed",
    };
  }

  // Determine overall status
  const allPassed = Object.values(checks).every((c) => c.status === "pass");
  const allFailed = Object.values(checks).every((c) => c.status === "fail");

  const overallStatus: HealthStatus["status"] = allPassed
    ? "healthy"
    : allFailed
    ? "unhealthy"
    : "degraded";

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(healthStatus, { status: httpStatus });
}

// Liveness probe (simple check)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

// Readiness probe
export async function OPTIONS() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
