// src/lib/import/import-session-service.ts
// Import Session Service - Track and manage import sessions

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { detectEntityType, autoMapHeaders } from './vietnamese-headers';

// Types
export interface CreateSessionInput {
  fileName: string;
  fileSize: number;
  fileType: string;
  headers: string[];
  preview: Record<string, unknown>[];
  userId: string;
}

export interface SessionAnalysisResult {
  sessionId: string;
  detectedType: string;
  confidence: number;
  columnMappings: {
    sourceColumn: string;
    targetField: string | null;
    confidence: number;
    isVietnamese: boolean;
  }[];
  totalRows: number;
  issues: {
    type: 'error' | 'warning' | 'info';
    message: string;
    messageVi: string;
  }[];
}

export interface UpdateSessionInput {
  columnMapping?: Record<string, string>;
  detectedType?: string;
  status?: string;
  validationErrors?: unknown[];
}

export interface ImportLogEntry {
  rowNumber: number;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'DUPLICATE' | 'MERGED';
  entityType: string;
  entityId?: string;
  data: Record<string, unknown>;
  errors?: string[];
}

// Service functions

/**
 * Create a new import session
 */
export async function createImportSession(input: CreateSessionInput): Promise<SessionAnalysisResult> {
  const { fileName, fileSize, fileType, headers, preview, userId } = input;

  // Detect entity type from headers
  const detection = detectEntityType(headers);

  // Auto-map columns
  const mappings = autoMapHeaders(headers, detection.type);

  // Create column mapping array
  const columnMappings = headers.map(header => {
    const match = mappings.get(header);
    return {
      sourceColumn: header,
      targetField: match?.field || null,
      confidence: match?.confidence || 0,
      isVietnamese: match?.isVietnamese || false,
    };
  });

  // Create session in database
  const session = await prisma.importSession.create({
    data: {
      fileName,
      fileSize,
      fileType,
      detectedType: detection.type.toUpperCase(),
      confidence: detection.confidence,
      status: 'ANALYZING',
      totalRows: preview.length,
      columnMapping: columnMappings.reduce((acc, m) => {
        if (m.targetField) {
          acc[m.sourceColumn] = m.targetField;
        }
        return acc;
      }, {} as Record<string, string>),
      importedBy: userId,
    },
  });

  // Analyze for issues
  const issues = analyzeForIssues(headers, preview, columnMappings);

  return {
    sessionId: session.id,
    detectedType: detection.type,
    confidence: detection.confidence,
    columnMappings,
    totalRows: preview.length,
    issues,
  };
}

/**
 * Analyze data for potential issues
 */
function analyzeForIssues(
  headers: string[],
  preview: Record<string, unknown>[],
  mappings: { sourceColumn: string; targetField: string | null; confidence: number }[]
): { type: 'error' | 'warning' | 'info'; message: string; messageVi: string }[] {
  const issues: { type: 'error' | 'warning' | 'info'; message: string; messageVi: string }[] = [];

  // Check for unmapped required columns
  const mappedFields = mappings.filter(m => m.targetField).map(m => m.targetField);
  const unmappedColumns = mappings.filter(m => !m.targetField).map(m => m.sourceColumn);

  if (unmappedColumns.length > 0) {
    issues.push({
      type: 'warning',
      message: `${unmappedColumns.length} columns could not be auto-mapped`,
      messageVi: `${unmappedColumns.length} cột không thể tự động nhận diện`,
    });
  }

  // Check for empty rows
  const emptyRows = preview.filter(row =>
    Object.values(row).every(v => v === null || v === '' || v === undefined)
  ).length;

  if (emptyRows > 0) {
    issues.push({
      type: 'warning',
      message: `${emptyRows} empty rows detected`,
      messageVi: `Phát hiện ${emptyRows} dòng trống`,
    });
  }

  // Check for low confidence mappings
  const lowConfidenceMappings = mappings.filter(m => m.targetField && m.confidence < 0.8);
  if (lowConfidenceMappings.length > 0) {
    issues.push({
      type: 'info',
      message: `${lowConfidenceMappings.length} columns have low confidence mappings`,
      messageVi: `${lowConfidenceMappings.length} cột có độ tin cậy thấp, nên kiểm tra lại`,
    });
  }

  return issues;
}

/**
 * Update import session
 */
export async function updateImportSession(sessionId: string, input: UpdateSessionInput) {
  const updateData: Record<string, unknown> = {};

  if (input.columnMapping !== undefined) {
    updateData.columnMapping = input.columnMapping;
  }
  if (input.detectedType !== undefined) {
    updateData.detectedType = input.detectedType;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.validationErrors !== undefined) {
    updateData.validationErrors = input.validationErrors;
  }

  return prisma.importSession.update({
    where: { id: sessionId },
    data: updateData,
  });
}

/**
 * Start import execution
 */
export async function startImportExecution(sessionId: string) {
  return prisma.importSession.update({
    where: { id: sessionId },
    data: {
      status: 'IMPORTING',
      startedAt: new Date(),
    },
  });
}

/**
 * Log import result for a row
 */
export async function logImportRow(sessionId: string, entry: ImportLogEntry) {
  return prisma.importLog.create({
    data: {
      sessionId,
      rowNumber: entry.rowNumber,
      status: entry.status,
      entityType: entry.entityType,
      entityId: entry.entityId,
      data: entry.data as object,
      errors: entry.errors ?? [],
    },
  });
}

/**
 * Batch log import results
 */
export async function logImportBatch(sessionId: string, entries: ImportLogEntry[]) {
  return prisma.importLog.createMany({
    data: entries.map(entry => ({
      sessionId,
      rowNumber: entry.rowNumber,
      status: entry.status,
      entityType: entry.entityType,
      entityId: entry.entityId,
      data: entry.data as object,
      errors: entry.errors ?? [],
    })),
  });
}

/**
 * Complete import session
 */
export async function completeImportSession(
  sessionId: string,
  result: { successRows: number; failedRows: number; skippedRows: number }
) {
  const status = result.failedRows > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
  return prisma.importSession.update({
    where: { id: sessionId },
    data: {
      status,
      completedAt: new Date(),
      successRows: result.successRows,
      failedRows: result.failedRows,
      skippedRows: result.skippedRows,
    },
  });
}

/**
 * Mark session as failed
 */
export async function failImportSession(sessionId: string, errors: unknown[]) {
  return prisma.importSession.update({
    where: { id: sessionId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      validationErrors: errors as object[],
    },
  });
}

/**
 * Rollback import session
 */
export async function rollbackImportSession(sessionId: string) {
  // Get all successful imports
  const logs = await prisma.importLog.findMany({
    where: {
      sessionId,
      status: 'SUCCESS',
      entityId: { not: null },
    },
  });

  // Group entity IDs by type for bulk deletion
  const entityGroups = new Map<string, string[]>();
  for (const log of logs) {
    if (!log.entityId) continue;
    const ids = entityGroups.get(log.entityType) || [];
    ids.push(log.entityId);
    entityGroups.set(log.entityType, ids);
  }

  // Execute rollback in a transaction for atomicity
  let deletedCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const [entityType, ids] of entityGroups) {
      try {
        let result: { count: number } = { count: 0 };
        switch (entityType) {
          case 'Part':
            result = await tx.part.deleteMany({ where: { id: { in: ids } } });
            break;
          case 'Supplier':
            result = await tx.supplier.deleteMany({ where: { id: { in: ids } } });
            break;
          case 'Customer':
            result = await tx.customer.deleteMany({ where: { id: { in: ids } } });
            break;
          case 'Product':
            result = await tx.product.deleteMany({ where: { id: { in: ids } } });
            break;
          case 'Inventory':
            result = await tx.inventory.deleteMany({ where: { id: { in: ids } } });
            break;
          case 'BomHeader':
          case 'BOM':
            // Delete BOM lines first, then headers
            await tx.bomLine.deleteMany({ where: { bomId: { in: ids } } });
            result = await tx.bomHeader.deleteMany({ where: { id: { in: ids } } });
            break;
          case 'Warehouse':
            result = await tx.warehouse.deleteMany({ where: { id: { in: ids } } });
            break;
          default:
            logger.warn(`Rollback not supported for entity type: ${entityType}`, { context: 'import-session-service' });
        }
        deletedCount += result.count;
      } catch (deleteError) {
        logger.warn(`Failed to rollback ${entityType} (${ids.length} records)`, { context: 'import-session-service', error: String(deleteError) });
        throw deleteError; // Re-throw to abort transaction
      }
    }

    // Update session status within the same transaction
    await tx.importSession.update({
      where: { id: sessionId },
      data: {
        status: 'ROLLED_BACK',
        rollbackAt: new Date(),
      },
    });
  });

  return { deletedCount };
}

/**
 * Get import session by ID
 */
export async function getImportSession(sessionId: string) {
  return prisma.importSession.findUnique({
    where: { id: sessionId },
    include: {
      logs: {
        take: 100,
        orderBy: { rowNumber: 'asc' },
      },
    },
  });
}

/**
 * Get import history for a user
 */
export async function getImportHistory(
  userId: string,
  options: {
    page?: number;
    pageSize?: number;
    status?: string;
    entityType?: string;
  } = {}
) {
  const { page = 1, pageSize = 20, status, entityType } = options;

  const where = {
    importedBy: userId,
    ...(status && { status }),
    ...(entityType && { detectedType: entityType }),
  };

  const [sessions, total] = await Promise.all([
    prisma.importSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { logs: true },
        },
      },
    }),
    prisma.importSession.count({ where }),
  ]);

  return {
    sessions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get import logs for a session
 */
export async function getImportLogs(
  sessionId: string,
  options: {
    page?: number;
    pageSize?: number;
    status?: string;
  } = {}
) {
  const { page = 1, pageSize = 50, status } = options;

  const where = {
    sessionId,
    ...(status && { status }),
  };

  const [logs, total] = await Promise.all([
    prisma.importLog.findMany({
      where,
      orderBy: { rowNumber: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.importLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Save column mapping as template
 */
export async function saveImportMapping(
  name: string,
  targetType: string,
  mapping: Record<string, string>,
  userId: string
) {
  return prisma.importMapping.create({
    data: {
      name,
      targetType: targetType.toUpperCase(),
      mapping,
      createdBy: userId,
    },
  });
}

/**
 * Get saved mappings for a user
 */
export async function getSavedMappings(userId: string, targetType?: string) {
  return prisma.importMapping.findMany({
    where: {
      createdBy: userId,
      ...(targetType && { targetType: targetType.toUpperCase() }),
    },
    orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
  });
}

/**
 * Use a saved mapping (updates usage count)
 */
export async function useSavedMapping(mappingId: string) {
  return prisma.importMapping.update({
    where: { id: mappingId },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Delete a saved mapping
 */
export async function deleteSavedMapping(mappingId: string, userId: string) {
  return prisma.importMapping.deleteMany({
    where: {
      id: mappingId,
      createdBy: userId,
    },
  });
}

export default {
  createImportSession,
  updateImportSession,
  startImportExecution,
  logImportRow,
  logImportBatch,
  completeImportSession,
  failImportSession,
  rollbackImportSession,
  getImportSession,
  getImportHistory,
  getImportLogs,
  saveImportMapping,
  getSavedMappings,
  useSavedMapping,
  deleteSavedMapping,
};
