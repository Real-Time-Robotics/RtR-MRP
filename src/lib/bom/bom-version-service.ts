// src/lib/bom/bom-version-service.ts
// R17: BOM version approval + effectivity date management

import { prisma } from "@/lib/prisma";

interface BomVersionInfo {
  bomId: string;
  productId: string;
  productName: string;
  version: string;
  status: string;
  effectiveDate: Date;
  expiryDate: Date | null;
  lineCount: number;
  totalCost: number;
}

interface BomApprovalResult {
  success: boolean;
  bomId: string;
  version: string;
  previousStatus: string;
  newStatus: string;
  errors: string[];
}

/**
 * Submit a BOM version for approval.
 * Only draft BOMs can be submitted.
 */
export async function submitBomForApproval(
  bomId: string,
  userId: string,
  notes?: string
): Promise<BomApprovalResult> {
  const bom = await prisma.bomHeader.findUnique({
    where: { id: bomId },
    include: { bomLines: true, product: true },
  });

  if (!bom) {
    return { success: false, bomId, version: "", previousStatus: "", newStatus: "", errors: ["BOM not found"] };
  }

  if (bom.status !== "draft") {
    return {
      success: false,
      bomId,
      version: bom.version,
      previousStatus: bom.status,
      newStatus: bom.status,
      errors: [`BOM must be in draft status to submit (current: ${bom.status})`],
    };
  }

  if (bom.bomLines.length === 0) {
    return {
      success: false,
      bomId,
      version: bom.version,
      previousStatus: bom.status,
      newStatus: bom.status,
      errors: ["BOM must have at least one line to submit for approval"],
    };
  }

  await prisma.bomHeader.update({
    where: { id: bomId },
    data: {
      status: "pending_approval",
      notes: [bom.notes, `[SUBMITTED] by ${userId} on ${new Date().toISOString()}`, notes]
        .filter(Boolean)
        .join("\n"),
    },
  });

  return {
    success: true,
    bomId,
    version: bom.version,
    previousStatus: "draft",
    newStatus: "pending_approval",
    errors: [],
  };
}

/**
 * Approve a BOM version.
 * Optionally deactivates the previous active version for the same product.
 */
export async function approveBom(
  bomId: string,
  userId: string,
  activateImmediately: boolean = true,
  notes?: string
): Promise<BomApprovalResult> {
  const bom = await prisma.bomHeader.findUnique({
    where: { id: bomId },
    include: { product: true },
  });

  if (!bom) {
    return { success: false, bomId, version: "", previousStatus: "", newStatus: "", errors: ["BOM not found"] };
  }

  if (bom.status !== "pending_approval") {
    return {
      success: false,
      bomId,
      version: bom.version,
      previousStatus: bom.status,
      newStatus: bom.status,
      errors: [`BOM must be pending_approval (current: ${bom.status})`],
    };
  }

  await prisma.$transaction(async (tx) => {
    if (activateImmediately) {
      // Deactivate current active BOM for the same product
      await tx.bomHeader.updateMany({
        where: {
          productId: bom.productId,
          status: "active",
          id: { not: bomId },
        },
        data: {
          status: "obsolete",
          expiryDate: new Date(),
        },
      });
    }

    await tx.bomHeader.update({
      where: { id: bomId },
      data: {
        status: activateImmediately ? "active" : "approved",
        effectiveDate: activateImmediately ? new Date() : bom.effectiveDate,
        notes: [bom.notes, `[APPROVED] by ${userId} on ${new Date().toISOString()}`, notes]
          .filter(Boolean)
          .join("\n"),
      },
    });
  });

  return {
    success: true,
    bomId,
    version: bom.version,
    previousStatus: "pending_approval",
    newStatus: activateImmediately ? "active" : "approved",
    errors: [],
  };
}

/**
 * Reject a BOM version, returning it to draft.
 */
export async function rejectBom(
  bomId: string,
  userId: string,
  reason: string
): Promise<BomApprovalResult> {
  const bom = await prisma.bomHeader.findUnique({
    where: { id: bomId },
  });

  if (!bom) {
    return { success: false, bomId, version: "", previousStatus: "", newStatus: "", errors: ["BOM not found"] };
  }

  if (bom.status !== "pending_approval") {
    return {
      success: false,
      bomId,
      version: bom.version,
      previousStatus: bom.status,
      newStatus: bom.status,
      errors: [`BOM must be pending_approval (current: ${bom.status})`],
    };
  }

  await prisma.bomHeader.update({
    where: { id: bomId },
    data: {
      status: "draft",
      notes: [bom.notes, `[REJECTED] by ${userId}: ${reason}`]
        .filter(Boolean)
        .join("\n"),
    },
  });

  return {
    success: true,
    bomId,
    version: bom.version,
    previousStatus: "pending_approval",
    newStatus: "draft",
    errors: [],
  };
}

/**
 * Create a new version of an existing BOM by cloning the active version.
 */
export async function createNewBomVersion(
  productId: string,
  userId: string,
  notes?: string
): Promise<{ bomId: string; version: string }> {
  // Find the latest version
  const latestBom = await prisma.bomHeader.findFirst({
    where: { productId },
    orderBy: { version: "desc" },
    include: { bomLines: true },
  });

  // Calculate next version
  let nextVersion = "1.0";
  if (latestBom) {
    const parts = latestBom.version.split(".");
    const major = parseInt(parts[0]) || 1;
    nextVersion = `${major + 1}.0`;
  }

  // Clone BOM with new version
  const newBom = await prisma.bomHeader.create({
    data: {
      productId,
      version: nextVersion,
      effectiveDate: new Date(),
      status: "draft",
      notes: [
        `Cloned from v${latestBom?.version || "N/A"} by ${userId}`,
        notes,
      ]
        .filter(Boolean)
        .join("\n"),
      bomLines: latestBom
        ? {
            create: latestBom.bomLines.map((line) => ({
              lineNumber: line.lineNumber,
              partId: line.partId,
              quantity: line.quantity,
              unit: line.unit,
              level: line.level,
              scrapRate: line.scrapRate,
              isCritical: line.isCritical,
              position: line.position,
              findNumber: line.findNumber,
              referenceDesignator: line.referenceDesignator,
              bomType: line.bomType,
            })),
          }
        : undefined,
    },
  });

  return { bomId: newBom.id, version: nextVersion };
}

/**
 * Get version history for a product's BOM.
 */
export async function getBomVersionHistory(
  productId: string
): Promise<BomVersionInfo[]> {
  const boms = await prisma.bomHeader.findMany({
    where: { productId },
    include: {
      product: { select: { name: true } },
      bomLines: {
        include: { part: { select: { unitCost: true } } },
      },
    },
    orderBy: { version: "desc" },
  });

  return boms.map((bom) => ({
    bomId: bom.id,
    productId: bom.productId,
    productName: bom.product.name,
    version: bom.version,
    status: bom.status,
    effectiveDate: bom.effectiveDate,
    expiryDate: bom.expiryDate,
    lineCount: bom.bomLines.length,
    totalCost: bom.bomLines.reduce(
      (sum, line) => sum + line.quantity * line.part.unitCost,
      0
    ),
  }));
}

/**
 * Get the currently active BOM for a product, respecting effectivity dates.
 */
export async function getEffectiveBom(
  productId: string,
  asOfDate: Date = new Date()
): Promise<BomVersionInfo | null> {
  const bom = await prisma.bomHeader.findFirst({
    where: {
      productId,
      status: "active",
      effectiveDate: { lte: asOfDate },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: asOfDate } },
      ],
    },
    include: {
      product: { select: { name: true } },
      bomLines: {
        include: { part: { select: { unitCost: true } } },
      },
    },
    orderBy: { effectiveDate: "desc" },
  });

  if (!bom) return null;

  return {
    bomId: bom.id,
    productId: bom.productId,
    productName: bom.product.name,
    version: bom.version,
    status: bom.status,
    effectiveDate: bom.effectiveDate,
    expiryDate: bom.expiryDate,
    lineCount: bom.bomLines.length,
    totalCost: bom.bomLines.reduce(
      (sum, line) => sum + line.quantity * line.part.unitCost,
      0
    ),
  };
}
