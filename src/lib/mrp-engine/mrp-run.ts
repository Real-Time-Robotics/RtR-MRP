/**
 * MRP Run Orchestration
 * Creates and executes MRP calculation runs.
 */

import prisma from "../prisma";
import { logger } from "@/lib/logger";
import { MrpEngine } from "../mrp/mrp-core";
import type { MrpParams } from "./types";

export async function runMrpCalculation(params: MrpParams) {
  // 1. Create MRP Run record
  const runNumber = `MRP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const mrpRun = await prisma.mrpRun.create({
    data: {
      runNumber,
      planningHorizon: params.planningHorizonDays,
      status: "running",
      parameters: JSON.parse(JSON.stringify(params)),
    },
  });

  try {
    // 2. Instantiate and run the New Recursive Engine
    // We pass the runId and params. The engine handles the heavy lifting.
    const engine = new MrpEngine(mrpRun.id, {
      runId: mrpRun.id,
      ...params
    });

    const result = await engine.execute();

    if (!result.success) {
      throw new Error("MRP Engine Failure");
    }

    // 3. Update Status (Engine might update suggestion counts, but we update status here to be sure)
    const updatedRun = await prisma.mrpRun.update({
      where: { id: mrpRun.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      }
    });

    return updatedRun;

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'mrp-engine', operation: 'calculate' });
    await prisma.mrpRun.update({
      where: { id: mrpRun.id },
      data: { status: "failed" },
    });
    throw error;
  }
}
