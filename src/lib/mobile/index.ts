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
