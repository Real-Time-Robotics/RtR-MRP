// src/app/api/ml/optimization/route.ts

import { NextRequest, NextResponse } from "next/server";
import { mlClient } from "@/lib/ml-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    let result;

    switch (type) {
      case "safety-stock":
        result = await mlClient.calculateSafetyStock({
          partId: body.partId,
          serviceLevel: body.serviceLevel,
          leadTimeDays: body.leadTimeDays,
          method: body.method,
        });
        break;

      case "eoq":
        result = await mlClient.calculateEOQ({
          partId: body.partId,
          orderCost: body.orderCost,
          holdingCostRate: body.holdingCostRate,
        });
        break;

      case "full":
      default:
        result = await mlClient.optimizeInventory({
          partId: body.partId,
          serviceLevel: body.serviceLevel,
          orderCost: body.orderCost,
          holdingCostRate: body.holdingCostRate,
        });
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Optimization failed" },
      { status: 500 }
    );
  }
}
