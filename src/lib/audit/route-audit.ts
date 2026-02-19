// src/lib/audit/route-audit.ts
// Helper for integrating audit trail into API routes

import { NextRequest } from "next/server";
import { createAuditMiddleware, type AuditContext } from "@/lib/compliance/audit-trail";
import { logger } from '@/lib/logger';

/**
 * Extract audit context from session and request headers
 */
export function getAuditContext(
  request: NextRequest,
  user: { id?: string; name?: string | null; email?: string | null } | null
): AuditContext {
  return {
    userId: user?.id,
    userName: user?.name || user?.email || undefined,
    ipAddress: request.headers.get("x-forwarded-for") || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

/**
 * Compare two objects and return a list of changed fields.
 * Only checks top-level scalar fields (ignores nested objects/arrays).
 */
export function getFieldChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack?: string[]
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
  const keys = fieldsToTrack || Object.keys(newObj);

  for (const key of keys) {
    if (key === "updatedAt" || key === "createdAt") continue;

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    // Skip if the new value is undefined (not being updated)
    if (newVal === undefined) continue;

    // Skip nested objects/arrays for field-level tracking
    if (typeof newVal === "object" && newVal !== null && !Array.isArray(newVal)) continue;
    if (Array.isArray(newVal)) continue;

    // Compare serialized values to handle type coercion (e.g., number vs string)
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, oldValue: oldVal, newValue: newVal });
    }
  }

  return changes;
}

/**
 * Log a CREATE action (non-blocking)
 */
export function auditCreate(
  request: NextRequest,
  user: { id?: string; name?: string | null; email?: string | null } | null,
  entityType: string,
  entityId: string,
  data?: unknown
): void {
  const ctx = getAuditContext(request, user);
  const audit = createAuditMiddleware(ctx);
  audit.logCreate(entityType, entityId, data).catch((err: unknown) => logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'route-audit' }));
}

/**
 * Log an UPDATE action with field-level change detection (non-blocking)
 */
export function auditUpdate(
  request: NextRequest,
  user: { id?: string; name?: string | null; email?: string | null } | null,
  entityType: string,
  entityId: string,
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack?: string[]
): void {
  const changes = getFieldChanges(oldObj, newObj, fieldsToTrack);
  if (changes.length === 0) return;

  const ctx = getAuditContext(request, user);
  const audit = createAuditMiddleware(ctx);
  audit.logUpdate(entityType, entityId, changes).catch((err: unknown) => logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'route-audit' }));
}

/**
 * Log a DELETE action (non-blocking)
 */
export function auditDelete(
  request: NextRequest,
  user: { id?: string; name?: string | null; email?: string | null } | null,
  entityType: string,
  entityId: string,
  previousData?: unknown
): void {
  const ctx = getAuditContext(request, user);
  const audit = createAuditMiddleware(ctx);
  audit.logDelete(entityType, entityId, previousData).catch((err: unknown) => logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'route-audit' }));
}

/**
 * Log a status change specifically (non-blocking)
 */
export function auditStatusChange(
  request: NextRequest,
  user: { id?: string; name?: string | null; email?: string | null } | null,
  entityType: string,
  entityId: string,
  oldStatus: string,
  newStatus: string
): void {
  const ctx = getAuditContext(request, user);
  const audit = createAuditMiddleware(ctx);
  audit.logUpdate(entityType, entityId, [
    { field: "status", oldValue: oldStatus, newValue: newStatus },
  ]).catch((err: unknown) => logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'route-audit' }));
}
