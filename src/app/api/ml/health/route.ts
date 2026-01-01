// src/app/api/ml/health/route.ts

import { NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";

export async function GET() {
  try {
    const health = await mlClient.healthCheck();
    return NextResponse.json(health);
  } catch {
    // ML Service is optional - return offline status without error
    return NextResponse.json({
      status: "offline",
      service: "rtr-ml-service",
      message: "ML Service not configured (optional)",
      features: {
        forecasting: false,
        leadTimePrediction: false,
        supplierRisk: false,
      },
    });
  }
}
