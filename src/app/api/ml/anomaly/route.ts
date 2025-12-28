// src/app/api/ml/anomaly/route.ts

import { NextRequest, NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await mlClient.detectAnomalies({
      partId: body.partId,
      lookbackDays: body.lookbackDays,
      contamination: body.contamination,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Anomaly detection failed" },
      { status: 500 }
    );
  }
}
