// lib/production/routing-engine.ts
import { prisma } from "@/lib/prisma";

export async function generateRoutingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.routing.count({
    where: {
      routingNumber: {
        startsWith: `RT-${year}`,
      },
    },
  });
  return `RT-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function calculateRoutingTotals(routingId: string): Promise<{
  totalSetupTime: number;
  totalRunTime: number;
  totalLaborTime: number;
  totalCost: number;
}> {
  const operations = await prisma.routingOperation.findMany({
    where: { routingId },
    include: { workCenter: true },
  });

  let totalSetupTime = 0;
  let totalRunTime = 0;
  let totalLaborTime = 0;
  let totalCost = 0;

  for (const op of operations) {
    totalSetupTime += op.setupTime;
    totalRunTime += op.runTimePerUnit;
    totalLaborTime += op.laborTimePerUnit || op.runTimePerUnit;

    // Calculate cost
    const hourlyRate = op.workCenter.hourlyRate || 0;
    const setupRate = op.workCenter.setupCostPerHour || hourlyRate;
    const overheadRate = op.workCenter.overheadRate || 0;

    const setupCost = (op.setupTime / 60) * setupRate;
    const runCost = (op.runTimePerUnit / 60) * hourlyRate;
    const overhead = (setupCost + runCost) * (overheadRate / 100);

    totalCost += setupCost + runCost + overhead;
  }

  return {
    totalSetupTime,
    totalRunTime,
    totalLaborTime,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

export async function createWorkOrderOperations(
  workOrderId: string,
  routingId: string,
  quantity: number
): Promise<void> {
  const routing = await prisma.routing.findUnique({
    where: { id: routingId },
    include: {
      operations: {
        orderBy: { operationNumber: "asc" },
      },
    },
  });

  if (!routing) {
    throw new Error("Routing not found");
  }

  for (const op of routing.operations) {
    await prisma.workOrderOperation.create({
      data: {
        workOrderId,
        routingOperationId: op.id,
        operationNumber: op.operationNumber,
        name: op.name,
        workCenterId: op.workCenterId,
        plannedSetupTime: op.setupTime,
        plannedRunTime: op.runTimePerUnit * quantity,
        quantityPlanned: quantity,
        status: "pending",
      },
    });
  }
}

export async function copyRouting(
  routingId: string,
  newVersion?: number
): Promise<string> {
  const routing = await prisma.routing.findUnique({
    where: { id: routingId },
    include: { operations: true },
  });

  if (!routing) {
    throw new Error("Routing not found");
  }

  const version =
    newVersion ||
    (await prisma.routing
      .findMany({
        where: { productId: routing.productId },
        orderBy: { version: "desc" },
        take: 1,
      })
      .then((r) => (r[0]?.version || 0) + 1));

  const newRouting = await prisma.routing.create({
    data: {
      routingNumber: await generateRoutingNumber(),
      name: routing.name,
      description: routing.description,
      productId: routing.productId,
      version,
      status: "draft",
      createdBy: routing.createdBy,
    },
  });

  for (const op of routing.operations) {
    await prisma.routingOperation.create({
      data: {
        routingId: newRouting.id,
        operationNumber: op.operationNumber,
        name: op.name,
        description: op.description,
        workCenterId: op.workCenterId,
        alternateWorkCenters: op.alternateWorkCenters ?? undefined,
        setupTime: op.setupTime,
        runTimePerUnit: op.runTimePerUnit,
        waitTime: op.waitTime,
        moveTime: op.moveTime,
        laborTimePerUnit: op.laborTimePerUnit,
        operatorsRequired: op.operatorsRequired,
        skillRequired: op.skillRequired,
        overlapPercent: op.overlapPercent,
        canRunParallel: op.canRunParallel,
        inspectionRequired: op.inspectionRequired,
        inspectionPlanId: op.inspectionPlanId,
        workInstructions: op.workInstructions,
        toolsRequired: op.toolsRequired ?? undefined,
        isSubcontracted: op.isSubcontracted,
        supplierId: op.supplierId,
      },
    });
  }

  return newRouting.id;
}

export async function activateRouting(routingId: string): Promise<void> {
  const routing = await prisma.routing.findUnique({
    where: { id: routingId },
  });

  if (!routing) {
    throw new Error("Routing not found");
  }

  // Deactivate any currently active routing for this product
  await prisma.routing.updateMany({
    where: {
      productId: routing.productId,
      status: "active",
    },
    data: {
      status: "obsolete",
      obsoleteDate: new Date(),
    },
  });

  // Activate this routing
  const totals = await calculateRoutingTotals(routingId);

  await prisma.routing.update({
    where: { id: routingId },
    data: {
      status: "active",
      effectiveDate: new Date(),
      ...totals,
    },
  });
}

export async function getActiveRouting(productId: string) {
  return prisma.routing.findFirst({
    where: {
      productId,
      status: "active",
    },
    include: {
      operations: {
        orderBy: { operationNumber: "asc" },
        include: { workCenter: true },
      },
    },
  });
}

export async function validateRouting(routingId: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const routing = await prisma.routing.findUnique({
    where: { id: routingId },
    include: {
      operations: {
        include: { workCenter: true },
      },
    },
  });

  if (!routing) {
    return { valid: false, errors: ["Routing not found"], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (routing.operations.length === 0) {
    errors.push("Routing has no operations");
  }

  const opNumbers = routing.operations.map((op) => op.operationNumber);
  if (new Set(opNumbers).size !== opNumbers.length) {
    errors.push("Duplicate operation numbers found");
  }

  for (const op of routing.operations) {
    if (!op.workCenter) {
      errors.push(`Operation ${op.operationNumber}: Work center not found`);
    } else if (op.workCenter.status !== "active") {
      warnings.push(
        `Operation ${op.operationNumber}: Work center ${op.workCenter.name} is not active`
      );
    }

    if (op.runTimePerUnit <= 0) {
      errors.push(
        `Operation ${op.operationNumber}: Run time must be greater than 0`
      );
    }

    if (op.inspectionRequired && !op.inspectionPlanId) {
      warnings.push(
        `Operation ${op.operationNumber}: Inspection required but no plan specified`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
