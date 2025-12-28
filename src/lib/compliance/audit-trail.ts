// src/lib/compliance/audit-trail.ts
// Enhanced Tamper-Proof Audit Trail System

import { prisma } from "@/lib/prisma";
import { createHash, randomUUID } from "crypto";

// Audit actions
export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "EXPORT"
  | "IMPORT"
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGE"
  | "MFA_ENABLED"
  | "MFA_DISABLED"
  | "SIGNATURE_CREATED"
  | "ACCESS_DENIED"
  | "PERMISSION_CHANGE"
  | "SYSTEM";

// Retention categories
export type RetentionCategory = "standard" | "extended" | "permanent";

// Context for audit entries
export interface AuditContext {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

// Audit entry input
export interface AuditEntryInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  changeSummary?: string;
  isSecurityEvent?: boolean;
  isComplianceEvent?: boolean;
  retentionCategory?: RetentionCategory;
}

// Generate hash for an entry
function generateEntryHash(data: {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
}): string {
  const hashInput = JSON.stringify({
    userId: data.userId || "system",
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId || "",
    fieldName: data.fieldName || "",
    oldValue: data.oldValue || "",
    newValue: data.newValue || "",
    timestamp: data.timestamp.toISOString(),
  });
  return createHash("sha256").update(hashInput).digest("hex");
}

// Generate chain hash
function generateChainHash(
  entryHash: string,
  previousChainHash: string | null
): string {
  const chainInput = previousChainHash
    ? `${previousChainHash}:${entryHash}`
    : entryHash;
  return createHash("sha256").update(chainInput).digest("hex");
}

// Serialize value for storage
function serializeValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Create an audit trail entry
export async function createAuditEntry(
  entry: AuditEntryInput,
  context: AuditContext = {}
): Promise<string> {
  const timestamp = new Date();
  const requestId = context.requestId || randomUUID();

  // Serialize values
  const oldValue = serializeValue(entry.oldValue);
  const newValue = serializeValue(entry.newValue);

  // Generate entry hash
  const entryHash = generateEntryHash({
    userId: context.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    fieldName: entry.fieldName,
    oldValue: oldValue ?? undefined,
    newValue: newValue ?? undefined,
    timestamp,
  });

  // Get previous entry for chain hash
  const previousEntry = await prisma.auditTrailEntry.findFirst({
    orderBy: { timestamp: "desc" },
    select: { chainHash: true },
  });

  // Generate chain hash
  const chainHash = generateChainHash(
    entryHash,
    previousEntry?.chainHash || null
  );

  // Determine retention category based on event type
  let retentionCategory = entry.retentionCategory || "standard";
  if (entry.isSecurityEvent || entry.isComplianceEvent) {
    retentionCategory = "extended";
  }
  if (
    entry.action === "SIGNATURE_CREATED" ||
    entry.entityType.includes("ITAR")
  ) {
    retentionCategory = "permanent";
  }

  // Create the entry
  const auditEntry = await prisma.auditTrailEntry.create({
    data: {
      userId: context.userId,
      userName: context.userName,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldName: entry.fieldName,
      oldValue,
      newValue,
      changeSummary: entry.changeSummary,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      requestId,
      entryHash,
      chainHash,
      timestamp,
      serverTime: new Date(),
      isSecurityEvent: entry.isSecurityEvent || false,
      isComplianceEvent: entry.isComplianceEvent || false,
      retentionCategory,
    },
  });

  return auditEntry.id;
}

// Batch create audit entries (for bulk operations)
export async function createBatchAuditEntries(
  entries: AuditEntryInput[],
  context: AuditContext = {}
): Promise<string[]> {
  const ids: string[] = [];
  for (const entry of entries) {
    const id = await createAuditEntry(entry, context);
    ids.push(id);
  }
  return ids;
}

// Verify audit trail integrity
export async function verifyAuditTrailIntegrity(options?: {
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}): Promise<{
  valid: boolean;
  entriesChecked: number;
  brokenAt?: string;
  error?: string;
}> {
  try {
    const entries = await prisma.auditTrailEntry.findMany({
      where: {
        timestamp: {
          gte: options?.fromDate,
          lte: options?.toDate,
        },
      },
      orderBy: { timestamp: "asc" },
      take: options?.limit,
    });

    if (entries.length === 0) {
      return { valid: true, entriesChecked: 0 };
    }

    let previousChainHash: string | null = null;

    // Get the entry before our range to establish the chain
    if (options?.fromDate) {
      const prevEntry = await prisma.auditTrailEntry.findFirst({
        where: { timestamp: { lt: options.fromDate } },
        orderBy: { timestamp: "desc" },
        select: { chainHash: true },
      });
      previousChainHash = prevEntry?.chainHash || null;
    }

    for (const entry of entries) {
      // Verify entry hash
      const expectedHash = generateEntryHash({
        userId: entry.userId || undefined,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || undefined,
        fieldName: entry.fieldName || undefined,
        oldValue: entry.oldValue || undefined,
        newValue: entry.newValue || undefined,
        timestamp: entry.timestamp,
      });

      if (expectedHash !== entry.entryHash) {
        return {
          valid: false,
          entriesChecked: entries.indexOf(entry) + 1,
          brokenAt: entry.id,
          error: "Entry hash mismatch - content may have been modified",
        };
      }

      // Verify chain hash
      const expectedChainHash = generateChainHash(
        entry.entryHash,
        previousChainHash
      );

      if (expectedChainHash !== entry.chainHash) {
        return {
          valid: false,
          entriesChecked: entries.indexOf(entry) + 1,
          brokenAt: entry.id,
          error: "Chain hash mismatch - audit trail integrity compromised",
        };
      }

      previousChainHash = entry.chainHash;
    }

    return { valid: true, entriesChecked: entries.length };
  } catch (error) {
    return {
      valid: false,
      entriesChecked: 0,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

// Search audit trail
export interface AuditSearchParams {
  userId?: string;
  action?: AuditAction | AuditAction[];
  entityType?: string;
  entityId?: string;
  fromDate?: Date;
  toDate?: Date;
  isSecurityEvent?: boolean;
  isComplianceEvent?: boolean;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export async function searchAuditTrail(params: AuditSearchParams) {
  const where: Record<string, unknown> = {};

  if (params.userId) where.userId = params.userId;
  if (params.entityType) where.entityType = params.entityType;
  if (params.entityId) where.entityId = params.entityId;
  if (params.isSecurityEvent !== undefined)
    where.isSecurityEvent = params.isSecurityEvent;
  if (params.isComplianceEvent !== undefined)
    where.isComplianceEvent = params.isComplianceEvent;

  if (params.action) {
    where.action = Array.isArray(params.action)
      ? { in: params.action }
      : params.action;
  }

  if (params.fromDate || params.toDate) {
    where.timestamp = {
      ...(params.fromDate && { gte: params.fromDate }),
      ...(params.toDate && { lte: params.toDate }),
    };
  }

  if (params.searchText) {
    where.OR = [
      { changeSummary: { contains: params.searchText, mode: "insensitive" } },
      { userName: { contains: params.searchText, mode: "insensitive" } },
      { entityId: { contains: params.searchText, mode: "insensitive" } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.auditTrailEntry.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.auditTrailEntry.count({ where }),
  ]);

  return { entries, total };
}

// Get entity history
export async function getEntityHistory(entityType: string, entityId: string) {
  const entries = await prisma.auditTrailEntry.findMany({
    where: { entityType, entityId },
    orderBy: { timestamp: "desc" },
  });

  return entries.map((e) => ({
    id: e.id,
    action: e.action,
    userName: e.userName,
    userId: e.userId,
    fieldName: e.fieldName,
    oldValue: e.oldValue,
    newValue: e.newValue,
    changeSummary: e.changeSummary,
    timestamp: e.timestamp,
    ipAddress: e.ipAddress,
  }));
}

// Get security events
export async function getSecurityEvents(options?: {
  limit?: number;
  fromDate?: Date;
}) {
  return prisma.auditTrailEntry.findMany({
    where: {
      isSecurityEvent: true,
      ...(options?.fromDate && {
        timestamp: { gte: options.fromDate },
      }),
    },
    orderBy: { timestamp: "desc" },
    take: options?.limit || 100,
  });
}

// Get compliance events
export async function getComplianceEvents(options?: {
  limit?: number;
  fromDate?: Date;
}) {
  return prisma.auditTrailEntry.findMany({
    where: {
      isComplianceEvent: true,
      ...(options?.fromDate && {
        timestamp: { gte: options.fromDate },
      }),
    },
    orderBy: { timestamp: "desc" },
    take: options?.limit || 100,
  });
}

// Generate audit report
export async function generateAuditReport(options: {
  fromDate: Date;
  toDate: Date;
  includeSecurityEvents?: boolean;
  includeComplianceEvents?: boolean;
  entityTypes?: string[];
}) {
  const where: Record<string, unknown> = {
    timestamp: {
      gte: options.fromDate,
      lte: options.toDate,
    },
  };

  if (options.entityTypes?.length) {
    where.entityType = { in: options.entityTypes };
  }

  // Get all entries
  const entries = await prisma.auditTrailEntry.findMany({
    where,
    orderBy: { timestamp: "asc" },
  });

  // Calculate statistics
  const stats = {
    totalEntries: entries.length,
    byAction: {} as Record<string, number>,
    byEntityType: {} as Record<string, number>,
    securityEvents: entries.filter((e) => e.isSecurityEvent).length,
    complianceEvents: entries.filter((e) => e.isComplianceEvent).length,
    uniqueUsers: new Set(entries.map((e) => e.userId).filter(Boolean)).size,
  };

  for (const entry of entries) {
    stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;
    stats.byEntityType[entry.entityType] =
      (stats.byEntityType[entry.entityType] || 0) + 1;
  }

  // Verify integrity
  const integrityCheck = await verifyAuditTrailIntegrity({
    fromDate: options.fromDate,
    toDate: options.toDate,
  });

  return {
    period: {
      from: options.fromDate,
      to: options.toDate,
    },
    statistics: stats,
    integrity: integrityCheck,
    generatedAt: new Date(),
  };
}

// Middleware helper for automatic audit logging
export function createAuditMiddleware(context: AuditContext) {
  return {
    async logCreate(entityType: string, entityId: string, data: unknown) {
      await createAuditEntry(
        {
          action: "CREATE",
          entityType,
          entityId,
          newValue: data,
          changeSummary: `Created ${entityType} ${entityId}`,
        },
        context
      );
    },

    async logUpdate(
      entityType: string,
      entityId: string,
      changes: { field: string; oldValue: unknown; newValue: unknown }[]
    ) {
      for (const change of changes) {
        await createAuditEntry(
          {
            action: "UPDATE",
            entityType,
            entityId,
            fieldName: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            changeSummary: `Updated ${change.field} on ${entityType} ${entityId}`,
          },
          context
        );
      }
    },

    async logDelete(
      entityType: string,
      entityId: string,
      previousData?: unknown
    ) {
      await createAuditEntry(
        {
          action: "DELETE",
          entityType,
          entityId,
          oldValue: previousData,
          changeSummary: `Deleted ${entityType} ${entityId}`,
        },
        context
      );
    },

    async logAccess(entityType: string, entityId: string) {
      await createAuditEntry(
        {
          action: "READ",
          entityType,
          entityId,
        },
        context
      );
    },

    async logSecurityEvent(action: AuditAction, details: string) {
      await createAuditEntry(
        {
          action,
          entityType: "Security",
          changeSummary: details,
          isSecurityEvent: true,
        },
        context
      );
    },
  };
}
