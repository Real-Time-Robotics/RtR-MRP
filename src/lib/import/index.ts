// src/lib/import/index.ts
// AI Smart Import Module Exports

export * from './vietnamese-headers';
export * from './import-session-service';

// Re-export main functions for convenience
export {
  normalizeVietnamese,
  findBestMatch,
  detectEntityType,
  autoMapHeaders,
  getVietnameseLabel,
  isVietnameseText,
  VIETNAMESE_HEADER_MAP,
} from './vietnamese-headers';

export {
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
} from './import-session-service';
