// Mobile library exports

// Scanner
export {
  BarcodeScanner,
  getScanner,
  destroyScanner,
  type ScanResult,
  type ScannerOptions,
} from "./scanner";

// Barcode Parser
export {
  parseBarcode,
  parseComplexBarcode,
  generateBarcodeValue,
  type ParsedBarcode,
  type EntityType,
} from "./barcode-parser";

// QR Generator
export {
  generateQRCodeDataURL,
  generateQRCodeToCanvas,
  generateQRCodeSVG,
  generateBarcodeToCanvas,
  generateBarcodeToSVG,
  generateBarcodeDataURL,
  generatePartQR,
  generateLocationQR,
  generateWorkOrderQR,
  generateBulkCodes,
  type QRCodeOptions,
  type BarcodeOptions,
  type PartLabelData,
  type LocationLabelData,
  type WorkOrderLabelData,
  type BulkCodeResult,
} from "./qr-generator";

// Offline Store
export {
  initDB,
  getDB,
  cachePart,
  cacheParts,
  getPartById,
  getPartBySku,
  searchParts,
  cacheLocation,
  cacheLocations,
  getLocationById,
  getLocationByCode,
  cacheWorkOrder,
  getWorkOrderById,
  getActiveWorkOrders,
  queueOfflineOperation,
  getPendingOperations,
  updateOperationStatus,
  deleteCompletedOperations,
  addScanHistory,
  getRecentScans,
  setSetting,
  getSetting,
  cachePickList,
  getPickListById,
  getActivePickLists,
  clearCache,
  getCacheStats,
} from "./offline-store";

// Sync Manager
export {
  syncPendingOperations,
  syncOperation,
  refreshCache,
  isOnline,
  onNetworkStatusChange,
  enableAutoSync,
  disableAutoSync,
  registerBackgroundSync,
  getSyncStatus,
  type SyncResult,
  type SyncProgress,
} from "./sync-manager";

// PWA
export {
  checkIfInstalled,
  initInstallPrompt,
  showInstallPrompt,
  canInstall,
  getInstallStatus,
  registerServiceWorker,
  updateServiceWorker,
  skipWaitingAndReload,
  onUpdateAvailable,
  requestNotificationPermission,
  sendNotification,
  cacheUrls,
  getStorageEstimate,
  requestPersistentStorage,
  isPersisted,
  type BeforeInstallPromptEvent,
} from "./pwa";

// Haptics
export {
  supportsHaptics,
  haptic,
  stopHaptic,
  customHaptic,
  hapticFeedback,
  playBeep,
  soundFeedback,
  feedback,
  type HapticPattern,
  type BeepOptions,
} from "./haptics";

// Label Generator
export {
  generateLabelHTML,
  generateLabelCanvas,
  printLabel,
  generateZPL,
  LABEL_SIZES,
  PART_LABEL_TEMPLATE,
  LOCATION_LABEL_TEMPLATE,
  WORK_ORDER_LABEL_TEMPLATE,
  type LabelSize,
  type LabelElement,
  type LabelTemplate,
} from "./label-generator";

// Scanner Utils (Phase 2)
export {
  parseBarcode as parseScanBarcode,
  getAvailableActions,
  triggerHaptic,
  playAudioFeedback,
  validateScan,
  HapticPatterns,
  DEFAULT_SCANNER_CONFIG,
  type BarcodeFormat,
  type EntityType as ScannerEntityType,
  type ScanResult as ScannerScanResult,
  type ScannerConfig,
  type ResolvedEntity,
} from "./scanner-utils";

// Sync Store (Phase 2)
export {
  getDB as getSyncDB,
  cacheParts as cacheSyncParts,
  getCachedPart,
  getCachedPartByNumber,
  searchCachedParts,
  getAllCachedParts,
  cacheLocations as cacheSyncLocations,
  getCachedLocationByCode,
  getAllCachedLocations,
  queueOperation,
  getPendingOperationsCount,
  getPendingOperations as getQueuedOperations,
  updateOperationStatus as updateQueuedOperationStatus,
  syncPendingOperations as syncQueuedOperations,
  logScan,
  getRecentScans as getSyncRecentScans,
  getSyncMetadata,
  getAllSyncMetadata,
  downloadMasterData,
  clearAllCache,
  getOfflineStatus,
  type CachedPart,
  type CachedLocation,
  type QueuedOperation,
  type OperationType,
  type ScanHistoryItem,
  type SyncMetadata,
} from "./sync-store";
