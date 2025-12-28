// src/app/api/ml/health/route.ts

import { NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";

export async function GET() {
  try {
    const health = await mlClient.healthCheck();
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      {
        status: "offline",
        service: "rtr-ml-service",
        error: error instanceof Error ? error.message : "ML Service unavailable",
      },
      { status: 503 }
    );
  }
}
