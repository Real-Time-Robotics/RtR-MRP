// src/app/api/ml/models/status/route.ts

import { NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";

export async function GET() {
  try {
    const status = await mlClient.getModelStatus();
    return NextResponse.json(status);
  } catch (error) {
    // Return default model status if ML service is unavailable
    return NextResponse.json({
      models: [
        {
          modelId: "ensemble_demand",
          modelType: "ensemble",
          status: "pending",
          lastTrained: null,
          metrics: {},
        },
        {
          modelId: "leadtime_predictor",
          modelType: "leadtime",
          status: "pending",
          lastTrained: null,
          metrics: {},
        },
        {
          modelId: "anomaly_detector",
          modelType: "anomaly",
          status: "pending",
          lastTrained: null,
          metrics: {},
        },
      ],
      total: 3,
      active: 0,
      mlServiceAvailable: false,
      error: error instanceof Error ? error.message : "ML Service unavailable",
    });
  }
}
