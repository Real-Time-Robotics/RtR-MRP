// Sync manager for offline operations
import { clientLogger } from '@/lib/client-logger';
import {
  getPendingOperations,
  updateOperationStatus,
  deleteCompletedOperations,
  cacheParts,
  cacheLocations,
  cacheWorkOrder,
} from "./offline-store";

export interface SyncResult {
  operationId: string;
  success: boolean;
  error?: string;
  serverResponse?: unknown;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

type SyncProgressCallback = (progress: SyncProgress) => void;

let isSyncing = false;
let syncProgressCallback: SyncProgressCallback | null = null;

// API endpoints for different operation types
const API_ENDPOINTS: Record<string, string> = {
  INVENTORY_ADJUSTMENT: "/api/mobile/inventory/adjust",
  INVENTORY_TRANSFER: "/api/mobile/inventory/transfer",
  INVENTORY_COUNT: "/api/mobile/inventory/count",
  PO_RECEIVE: "/api/mobile/receiving/receive",
  PICK_LINE: "/api/mobile/picking/pick",
  WORK_ORDER_STATUS: "/api/mobile/work-orders/status",
  WORK_ORDER_TIME: "/api/mobile/work-orders/time",
  QUALITY_INSPECTION: "/api/mobile/quality/inspect",
  SCAN_LOG: "/api/mobile/scans/log",
};

// Sync all pending operations
export async function syncPendingOperations(
  onProgress?: SyncProgressCallback
): Promise<SyncResult[]> {
  if (isSyncing) {
    return [];
  }

  isSyncing = true;
  syncProgressCallback = onProgress || null;

  const results: SyncResult[] = [];
  const pendingOps = await getPendingOperations();

  const progress: SyncProgress = {
    total: pendingOps.length,
    completed: 0,
    failed: 0,
    inProgress: true,
  };

  notifyProgress(progress);

  for (const op of pendingOps) {
    try {
      await updateOperationStatus(op.id, "syncing");

      const endpoint = API_ENDPOINTS[op.operationType];
      if (!endpoint) {
        throw new Error(`Unknown operation type: ${op.operationType}`);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...op.payload,
          offlineOperationId: op.id,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      await updateOperationStatus(op.id, "completed");
      results.push({
        operationId: op.id,
        success: true,
        serverResponse: data,
      });

      progress.completed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await updateOperationStatus(op.id, "failed", errorMessage);
      results.push({
        operationId: op.id,
        success: false,
        error: errorMessage,
      });

      progress.failed++;
    }

    notifyProgress(progress);
  }

  progress.inProgress = false;
  notifyProgress(progress);

  // Cleanup old completed operations
  await deleteCompletedOperations();

  isSyncing = false;
  syncProgressCallback = null;

  return results;
}

// Sync a single operation
export async function syncOperation(operationId: string): Promise<SyncResult> {
  const pendingOps = await getPendingOperations();
  const op = pendingOps.find((o) => o.id === operationId);

  if (!op) {
    return {
      operationId,
      success: false,
      error: "Operation not found",
    };
  }

  try {
    await updateOperationStatus(op.id, "syncing");

    const endpoint = API_ENDPOINTS[op.operationType];
    if (!endpoint) {
      throw new Error(`Unknown operation type: ${op.operationType}`);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...op.payload,
        offlineOperationId: op.id,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    await updateOperationStatus(op.id, "completed");

    return {
      operationId: op.id,
      success: true,
      serverResponse: data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await updateOperationStatus(op.id, "failed", errorMessage);

    return {
      operationId: op.id,
      success: false,
      error: errorMessage,
    };
  }
}

// Refresh cache from server
export async function refreshCache(): Promise<{
  parts: number;
  locations: number;
  workOrders: number;
}> {
  const results = {
    parts: 0,
    locations: 0,
    workOrders: 0,
  };

  // Fetch parts
  try {
    const partsResponse = await fetch("/api/mobile/parts?limit=1000");
    if (partsResponse.ok) {
      const { parts } = await partsResponse.json();
      if (parts && Array.isArray(parts)) {
        await cacheParts(
          parts.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            sku: p.sku as string,
            name: p.name as string,
            description: p.description as string | undefined,
            category: p.category as string | undefined,
            uom: p.uom as string,
            safetyStock: p.safetyStock as number | undefined,
            reorderPoint: p.reorderPoint as number | undefined,
            cachedAt: new Date(),
          }))
        );
        results.parts = parts.length;
      }
    }
  } catch (error) {
    clientLogger.error("Failed to refresh parts cache", error);
  }

  // Fetch locations
  try {
    const locationsResponse = await fetch("/api/mobile/locations?limit=1000");
    if (locationsResponse.ok) {
      const { locations } = await locationsResponse.json();
      if (locations && Array.isArray(locations)) {
        await cacheLocations(
          locations.map((l: Record<string, unknown>) => ({
            id: l.id as string,
            code: l.code as string,
            name: l.name as string,
            warehouseId: l.warehouseId as string,
            warehouseName: l.warehouseName as string,
            zone: l.zone as string | undefined,
            aisle: l.aisle as string | undefined,
            rack: l.rack as string | undefined,
            shelf: l.shelf as string | undefined,
            bin: l.bin as string | undefined,
            cachedAt: new Date(),
          }))
        );
        results.locations = locations.length;
      }
    }
  } catch (error) {
    clientLogger.error("Failed to refresh locations cache", error);
  }

  // Fetch active work orders
  try {
    const woResponse = await fetch("/api/mobile/work-orders?status=active");
    if (woResponse.ok) {
      const { workOrders } = await woResponse.json();
      if (workOrders && Array.isArray(workOrders)) {
        for (const wo of workOrders) {
          await cacheWorkOrder({
            id: wo.id,
            number: wo.number,
            productId: wo.productId,
            productName: wo.productName,
            quantity: wo.quantity,
            status: wo.status,
            priority: wo.priority,
            scheduledDate: wo.scheduledDate,
            cachedAt: new Date(),
          });
        }
        results.workOrders = workOrders.length;
      }
    }
  } catch (error) {
    clientLogger.error("Failed to refresh work orders cache", error);
  }

  return results;
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Network status listener
export function onNetworkStatusChange(
  callback: (online: boolean) => void
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// Auto-sync when coming back online
let autoSyncEnabled = false;
let autoSyncUnsubscribe: (() => void) | null = null;

export function enableAutoSync(onSyncComplete?: (results: SyncResult[]) => void): void {
  if (autoSyncEnabled) return;

  autoSyncEnabled = true;
  autoSyncUnsubscribe = onNetworkStatusChange(async (online) => {
    if (online) {
      const results = await syncPendingOperations();
      onSyncComplete?.(results);
    }
  });
}

export function disableAutoSync(): void {
  if (autoSyncUnsubscribe) {
    autoSyncUnsubscribe();
    autoSyncUnsubscribe = null;
  }
  autoSyncEnabled = false;
}

// Helper to notify progress
function notifyProgress(progress: SyncProgress): void {
  if (syncProgressCallback) {
    syncProgressCallback(progress);
  }
}

// Register for background sync (service worker)
export async function registerBackgroundSync(): Promise<boolean> {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-offline-operations");
      return true;
    } catch (error) {
      clientLogger.error("Background sync registration failed", error);
      return false;
    }
  }
  return false;
}

// Get sync status
export function getSyncStatus(): {
  isSyncing: boolean;
  autoSyncEnabled: boolean;
  isOnline: boolean;
} {
  return {
    isSyncing,
    autoSyncEnabled,
    isOnline: isOnline(),
  };
}
