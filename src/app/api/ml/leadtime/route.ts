// src/app/api/ml/leadtime/route.ts

import { NextRequest, NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await mlClient.predictLeadTime({
      supplierId: body.supplierId,
      orderValue: body.orderValue,
      lineCount: body.lineCount,
      totalQuantity: body.totalQuantity,
      isCritical: body.isCritical,
      partCategory: body.partCategory,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prediction failed" },
      { status: 500 }
    );
  }
}
