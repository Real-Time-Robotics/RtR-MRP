// src/app/api/ml/forecast/route.ts

import { NextRequest, NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await mlClient.forecastDemand({
      partId: body.partId,
      horizonDays: body.horizonDays,
      modelType: body.modelType,
      retrain: body.retrain,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Forecast failed" },
      { status: 500 }
    );
  }
}
