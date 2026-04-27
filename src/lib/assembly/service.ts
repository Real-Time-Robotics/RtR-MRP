// src/lib/assembly/service.ts — Assembly Order service (Sprint 27 TIP-S27-03)
// Handles AO number generation, child serial validation, and assembly completion.

import { PrismaClient, Prisma, SerialUnit, BomLine } from '@prisma/client';
import prismaDefault from '@/lib/prisma';
import { generateSerial, SerialNumberingRuleNotFoundError } from '@/lib/serial/numbering';

// =============================================================================
// ERRORS
// =============================================================================

export class IncompleteAssemblyError extends Error {
  missingByBomLine: { bomLineId: string; partId: string; expected: number; actual: number }[];
  constructor(missing: { bomLineId: string; partId: string; expected: number; actual: number }[]) {
    super(`Assembly incomplete: ${missing.length} BOM line(s) missing children`);
    this.name = 'IncompleteAssemblyError';
    this.missingByBomLine = missing;
  }
}

export class NoModuleDesignForProductError extends Error {
  constructor(productId: string) {
    super(`No ModuleDesign found for product ${productId} — cannot generate parent serial`);
    this.name = 'NoModuleDesignForProductError';
  }
}

export class AssemblyOrderNotFoundError extends Error {
  constructor(aoId: string) {
    super(`AssemblyOrder not found: ${aoId}`);
    this.name = 'AssemblyOrderNotFoundError';
  }
}

export class InvalidAssemblyStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAssemblyStateError';
  }
}

// =============================================================================
// AO NUMBER GENERATION
// =============================================================================

const MAX_AO_RETRIES = 3;

export async function generateAoNumber(
  now?: Date,
  prisma?: PrismaClient
): Promise<string> {
  const db = prisma || prismaDefault;
  const d = now || new Date();
  const year = d.getFullYear();

  const count = await db.assemblyOrder.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });

  const next = count + 1;
  return `AO-${year}-${String(next).padStart(4, '0')}`;
}

// =============================================================================
// CHILD SERIAL VALIDATION
// =============================================================================

export async function validateChildSerial(
  aoId: string,
  childSerial: string,
  prisma?: PrismaClient
): Promise<
  | { ok: true; childUnit: SerialUnit; bomLine: BomLine }
  | { ok: false; reason: string }
> {
  const db = prisma || prismaDefault;

  // 1. Lookup serial unit
  const childUnit = await db.serialUnit.findUnique({
    where: { serial: childSerial },
  });
  if (!childUnit) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  // 2. Check status
  if (childUnit.status !== 'IN_STOCK') {
    return { ok: false, reason: 'NOT_IN_STOCK' };
  }

  // 3. Lookup AO's BOM lines
  const ao = await db.assemblyOrder.findUnique({
    where: { id: aoId },
    include: {
      bomHeader: {
        include: { bomLines: true },
      },
    },
  });
  if (!ao) {
    return { ok: false, reason: 'AO_NOT_FOUND' };
  }

  // Match child to BOM line by partId or moduleDesign's productId
  const matchedLine = ao.bomHeader.bomLines.find((line) => {
    if (childUnit.partId && line.partId === childUnit.partId) return true;
    if (childUnit.productId && line.partId === childUnit.productId) return true;
    return false;
  });

  if (!matchedLine) {
    return { ok: false, reason: 'NOT_IN_BOM' };
  }

  // 4. Check if already used in any SerialLink
  const existingLink = await db.serialLink.findUnique({
    where: { childSerialId: childUnit.id },
  });
  if (existingLink) {
    return { ok: false, reason: 'ALREADY_USED' };
  }

  return { ok: true, childUnit, bomLine: matchedLine };
}

// =============================================================================
// COMPLETE ASSEMBLY ORDER
// =============================================================================

export async function completeAssemblyOrder(
  aoId: string,
  userId: string,
  prisma?: PrismaClient
): Promise<{ parentSerial: string; aoId: string }> {
  const db = prisma || prismaDefault;

  return db.$transaction(async (tx) => {
    // 1. Lookup AO + BOM lines
    const ao = await tx.assemblyOrder.findUnique({
      where: { id: aoId },
      include: {
        bomHeader: {
          include: { bomLines: true },
        },
      },
    });
    if (!ao) throw new AssemblyOrderNotFoundError(aoId);
    if (ao.status !== 'IN_PROGRESS') {
      throw new InvalidAssemblyStateError(`AO status is ${ao.status}, expected IN_PROGRESS`);
    }

    // 2. Find allocated children (SerialUnit with meta.allocatedToAoId = aoId)
    const allocatedChildren = await tx.serialUnit.findMany({
      where: {
        status: 'ALLOCATED',
        meta: { path: ['allocatedToAoId'], equals: aoId },
      },
    });

    // 3. Validate: each BOM line has enough allocated children
    const countByBomLine = new Map<string, { count: number; units: SerialUnit[] }>();
    for (const child of allocatedChildren) {
      // Match child to BOM line
      const matchedLine = ao.bomHeader.bomLines.find((line) => {
        if (child.partId && line.partId === child.partId) return true;
        if (child.productId && line.partId === child.productId) return true;
        return false;
      });
      if (matchedLine) {
        const entry = countByBomLine.get(matchedLine.id) || { count: 0, units: [] };
        entry.count++;
        entry.units.push(child);
        countByBomLine.set(matchedLine.id, entry);
      }
    }

    const missing: { bomLineId: string; partId: string; expected: number; actual: number }[] = [];
    for (const line of ao.bomHeader.bomLines) {
      const entry = countByBomLine.get(line.id);
      const actual = entry?.count || 0;
      const expected = Math.ceil(line.quantity * ao.targetQuantity);
      if (actual < expected) {
        missing.push({ bomLineId: line.id, partId: line.partId, expected, actual });
      }
    }
    if (missing.length > 0) {
      throw new IncompleteAssemblyError(missing);
    }

    // 4. Find ModuleDesign for parent serial generation
    const moduleDesign = await tx.moduleDesign.findFirst({
      where: { productId: ao.productId },
    });
    if (!moduleDesign) {
      throw new NoModuleDesignForProductError(ao.productId);
    }

    // 5. Generate parent serial
    const parentSerialStr = await generateSerial({
      moduleDesignId: moduleDesign.id,
      prismaClient: tx as unknown as PrismaClient,
    });

    // 6. Create parent SerialUnit
    const parentUnit = await tx.serialUnit.create({
      data: {
        serial: parentSerialStr,
        productId: ao.productId,
        moduleDesignId: moduleDesign.id,
        status: 'IN_STOCK',
        source: 'MANUFACTURED',
        createdByUserId: userId,
      },
    });

    // 7. Mark children as CONSUMED + create SerialLinks
    for (const child of allocatedChildren) {
      await tx.serialUnit.update({
        where: { id: child.id },
        data: {
          status: 'CONSUMED',
          meta: { ...(child.meta as object || {}), allocatedToAoId: null, consumedAt: new Date().toISOString() },
        },
      });

      // Find matching BOM line for this child
      const matchedLine = ao.bomHeader.bomLines.find((line) => {
        if (child.partId && line.partId === child.partId) return true;
        if (child.productId && line.partId === child.productId) return true;
        return false;
      });

      await tx.serialLink.create({
        data: {
          parentSerialId: parentUnit.id,
          childSerialId: child.id,
          bomLineId: matchedLine?.id || null,
          assemblyOrderId: aoId,
          linkedByUserId: userId,
        },
      });
    }

    // 8. Update AO
    await tx.assemblyOrder.update({
      where: { id: aoId },
      data: {
        status: 'COMPLETED',
        parentSerialId: parentUnit.id,
        completedAt: new Date(),
      },
    });

    return { parentSerial: parentSerialStr, aoId };
  }, {
    timeout: 30000,
  });
}
