import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock offline-store before importing sync-manager
const mockGetPendingOperations = vi.fn().mockResolvedValue([]);
const mockUpdateOperationStatus = vi.fn().mockResolvedValue(undefined);
const mockDeleteCompletedOperations = vi.fn().mockResolvedValue(undefined);
const mockCacheParts = vi.fn().mockResolvedValue(undefined);
const mockCacheLocations = vi.fn().mockResolvedValue(undefined);
const mockCacheWorkOrder = vi.fn().mockResolvedValue(undefined);

vi.mock('../offline-store', () => ({
  getPendingOperations: mockGetPendingOperations,
  updateOperationStatus: mockUpdateOperationStatus,
  deleteCompletedOperations: mockDeleteCompletedOperations,
  cacheParts: mockCacheParts,
  cacheLocations: mockCacheLocations,
  cacheWorkOrder: mockCacheWorkOrder,
}));

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock navigator and window
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true, serviceWorker: undefined },
  writable: true,
  configurable: true,
});

// We need to reset the module state between tests since it has module-level variables
let syncManager: typeof import('../sync-manager');

describe('sync-manager', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Re-setup mocks after module reset
    vi.doMock('../offline-store', () => ({
      getPendingOperations: mockGetPendingOperations,
      updateOperationStatus: mockUpdateOperationStatus,
      deleteCompletedOperations: mockDeleteCompletedOperations,
      cacheParts: mockCacheParts,
      cacheLocations: mockCacheLocations,
      cacheWorkOrder: mockCacheWorkOrder,
    }));

    vi.doMock('@/lib/client-logger', () => ({
      clientLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    syncManager = await import('../sync-manager');
  });

  describe('syncPendingOperations', () => {
    it('should return empty array when no pending operations', async () => {
      mockGetPendingOperations.mockResolvedValueOnce([]);
      const results = await syncManager.syncPendingOperations();
      expect(results).toEqual([]);
    });

    it('should sync a pending operation successfully', async () => {
      mockGetPendingOperations.mockResolvedValueOnce([
        {
          id: 'op-1',
          operationType: 'INVENTORY_ADJUSTMENT',
          entityType: 'inventory',
          payload: { partId: 'p1', qty: 10 },
          status: 'pending',
          attempts: 0,
          createdAt: new Date(),
        },
      ]);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const results = await syncManager.syncPendingOperations();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].operationId).toBe('op-1');
      expect(mockUpdateOperationStatus).toHaveBeenCalledWith('op-1', 'syncing');
      expect(mockUpdateOperationStatus).toHaveBeenCalledWith('op-1', 'completed');
      expect(mockDeleteCompletedOperations).toHaveBeenCalled();
    });

    it('should handle API error', async () => {
      mockGetPendingOperations.mockResolvedValueOnce([
        {
          id: 'op-2',
          operationType: 'INVENTORY_ADJUSTMENT',
          entityType: 'inventory',
          payload: {},
          status: 'pending',
          attempts: 0,
          createdAt: new Date(),
        },
      ]);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      } as Response);

      const results = await syncManager.syncPendingOperations();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('API error: 500');
      expect(mockUpdateOperationStatus).toHaveBeenCalledWith('op-2', 'failed', expect.any(String));
    });

    it('should handle unknown operation type', async () => {
      mockGetPendingOperations.mockResolvedValueOnce([
        {
          id: 'op-3',
          operationType: 'UNKNOWN_TYPE',
          entityType: 'unknown',
          payload: {},
          status: 'pending',
          attempts: 0,
          createdAt: new Date(),
        },
      ]);

      const results = await syncManager.syncPendingOperations();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Unknown operation type');
    });

    it('should call progress callback', async () => {
      mockGetPendingOperations.mockResolvedValueOnce([
        {
          id: 'op-4',
          operationType: 'INVENTORY_ADJUSTMENT',
          entityType: 'inventory',
          payload: {},
          status: 'pending',
          attempts: 0,
          createdAt: new Date(),
        },
      ]);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      const progressCallback = vi.fn();
      await syncManager.syncPendingOperations(progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.inProgress).toBe(false);
    });

    it('should return empty when already syncing', async () => {
      // Start a slow sync
      mockGetPendingOperations.mockResolvedValueOnce([
        {
          id: 'op-slow',
          operationType: 'INVENTORY_ADJUSTMENT',
          entityType: 'inventory',
          payload: {},
          status: 'pending',
          attempts: 0,
          createdAt: new Date(),
        },
      ]);

      vi.mocked(global.fetch).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response), 100))
      );

      const firstSync = syncManager.syncPendingOperations();
      const secondSync = await syncManager.syncPendingOperations();
      expect(secondSync).toEqual([]);

      await firstSync; // cleanup
    });
  });

  describe('syncOperation', () => {
    it('should sync a single operation by ID', async () => {
      mockGetPendingOperations.mockResolvedValueOnce([
        {
          id: 'op-single',
          operationType: 'INVENTORY_ADJUSTMENT',
          entityType: 'inventory',
          payload: { partId: 'p1' },
          status: 'pending',
          attempts: 0,
          createdAt: new Date(),
        },
      ]);

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'result-1' }),
      } as Response);

      const result = await syncManager.syncOperation('op-single');
      expect(result.success).toBe(true);
      expect(result.operationId).toBe('op-single');
    });

    it('should return failure for non-existent operation', async () => {
      mockGetPendingOperations.mockResolvedValueOnce([]);

      const result = await syncManager.syncOperation('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation not found');
    });
  });

  describe('refreshCache', () => {
    it('should fetch and cache parts, locations, and work orders', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            parts: [{ id: 'p1', sku: 'SKU-001', name: 'Part 1', uom: 'pcs' }],
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            locations: [{ id: 'l1', code: 'LOC-01', name: 'Location 1', warehouseId: 'wh1', warehouseName: 'Main' }],
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            workOrders: [
              { id: 'wo1', number: 'WO-001', productId: 'pr1', productName: 'Widget', quantity: 100, status: 'RELEASED' },
            ],
          }),
        } as Response);

      const result = await syncManager.refreshCache();
      expect(result.parts).toBe(1);
      expect(result.locations).toBe(1);
      expect(result.workOrders).toBe(1);
      expect(mockCacheParts).toHaveBeenCalled();
      expect(mockCacheLocations).toHaveBeenCalled();
      expect(mockCacheWorkOrder).toHaveBeenCalled();
    });

    it('should handle fetch failure gracefully', async () => {
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await syncManager.refreshCache();
      expect(result.parts).toBe(0);
      expect(result.locations).toBe(0);
      expect(result.workOrders).toBe(0);
    });

    it('should handle non-ok responses', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: false } as Response)
        .mockResolvedValueOnce({ ok: false } as Response)
        .mockResolvedValueOnce({ ok: false } as Response);

      const result = await syncManager.refreshCache();
      expect(result.parts).toBe(0);
      expect(result.locations).toBe(0);
      expect(result.workOrders).toBe(0);
    });
  });

  describe('isOnline', () => {
    it('should return navigator.onLine value', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      expect(syncManager.isOnline()).toBe(true);

      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      expect(syncManager.isOnline()).toBe(false);
    });
  });

  describe('getSyncStatus', () => {
    it('should return current sync status', () => {
      const status = syncManager.getSyncStatus();
      expect(status).toHaveProperty('isSyncing');
      expect(status).toHaveProperty('autoSyncEnabled');
      expect(status).toHaveProperty('isOnline');
    });
  });

  describe('onNetworkStatusChange', () => {
    it('should register and unregister event listeners', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const callback = vi.fn();
      const unsubscribe = syncManager.onNetworkStatusChange(callback);

      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unsubscribe();

      expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('enableAutoSync / disableAutoSync', () => {
    it('should enable and disable auto sync', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');

      syncManager.enableAutoSync();
      expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));

      // Calling again should be no-op
      syncManager.enableAutoSync();

      syncManager.disableAutoSync();
      const status = syncManager.getSyncStatus();
      expect(status.autoSyncEnabled).toBe(false);

      addSpy.mockRestore();
    });
  });

  describe('registerBackgroundSync', () => {
    it('should return false when serviceWorker is not available', async () => {
      Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
      const result = await syncManager.registerBackgroundSync();
      expect(result).toBe(false);
    });
  });
});
