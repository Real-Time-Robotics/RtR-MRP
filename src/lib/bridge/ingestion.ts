// Bridge Layer — Ingestion service (apply mapping → upsert canonical)
// Sprint 28 TIP-S28-09

import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

interface ColumnMapping {
  [sourceColumn: string]: string; // source → target field
}

interface IngestionResult {
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsError: number;
  errors: Array<{ row: number; error: string }>;
}

export async function runIngestion(
  sourceId: string,
  fileBuffer: Buffer,
  targetEntity: string,
  columnMappings: ColumnMapping,
  triggeredByUserId?: string
): Promise<IngestionResult> {
  // Parse file
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const result: IngestionResult = {
    rowsRead: rows.length,
    rowsCreated: 0,
    rowsUpdated: 0,
    rowsError: 0,
    errors: [],
  };

  // Create SyncJob
  const syncJob = await prisma.syncJob.create({
    data: {
      sourceId,
      mappingVersion: 1,
      status: 'running',
      startedAt: new Date(),
      triggeredByUserId,
    },
  });

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const mapped: Record<string, unknown> = {};

      for (const [sourceCol, targetField] of Object.entries(columnMappings)) {
        if (row[sourceCol] !== undefined && row[sourceCol] !== '') {
          mapped[targetField] = row[sourceCol];
        }
      }

      // Skip empty rows
      if (Object.keys(mapped).length === 0) continue;

      // Upsert based on target entity
      if (targetEntity === 'Part' && mapped.partNumber) {
        const existing = await prisma.part.findFirst({
          where: { partNumber: String(mapped.partNumber) },
        });

        if (existing) {
          await prisma.part.update({
            where: { id: existing.id },
            data: mapped,
          });
          result.rowsUpdated++;
        } else {
          await prisma.part.create({
            data: mapped as any,
          });
          result.rowsCreated++;
        }
      } else if (targetEntity === 'Supplier' && mapped.code) {
        const existing = await prisma.supplier.findFirst({
          where: { code: String(mapped.code) },
        });

        if (existing) {
          await prisma.supplier.update({
            where: { id: existing.id },
            data: mapped,
          });
          result.rowsUpdated++;
        } else {
          await prisma.supplier.create({
            data: mapped as any,
          });
          result.rowsCreated++;
        }
      } else {
        // Generic: log as error (unsupported entity or missing key)
        result.rowsError++;
        result.errors.push({ row: i + 1, error: `Unsupported entity "${targetEntity}" or missing key field` });
      }
    } catch (error) {
      result.rowsError++;
      result.errors.push({ row: i + 1, error: String(error) });
    }
  }

  // Update SyncJob
  await prisma.syncJob.update({
    where: { id: syncJob.id },
    data: {
      status: result.rowsError > 0 ? 'partial' : 'done',
      completedAt: new Date(),
      rowsRead: result.rowsRead,
      rowsCreated: result.rowsCreated,
      rowsUpdated: result.rowsUpdated,
      rowsError: result.rowsError,
      errorMessage: result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 10)) : null,
    },
  });

  // Update DataSource
  await prisma.dataSource.update({
    where: { id: sourceId },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: result.rowsError > 0 ? 'partial' : 'success',
    },
  });

  return result;
}
