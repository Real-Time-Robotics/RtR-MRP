import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock DB instance
const { mockStore, mockTx, mockDB } = vi.hoisted(() => {
  const mockStore = {
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  const mockTx = {
    store: mockStore,
    done: Promise.resolve(),
  };

  const mockDB = {
    get: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getFromIndex: vi.fn(),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
    put: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn().mockReturnValue(mockTx),
  };

  return { mockStore, mockTx, mockDB };
});

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockDB),
}));

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock navigator and fetch
const mockNavigator = { onLine: true };
Object.defineProperty(globalThis, 'navigator', {
  value: mockNavigator,
  writable: true,
  configurable: true,
});

import {
  getDB,
  cacheParts,
  getCachedPart,
  getCachedPartByNumber,
  searchCachedParts,
  getAllCachedParts,
  cacheLocations,
  getCachedLocationByCode,
  getAllCachedLocations,
  queueOperation,
  getPendingOperationsCount,
  getPendingOperations,
  updateOperationStatus,
  syncPendingOperations,
  logScan,
  getRecentScans,
  getSyncMetadata,
  getAllSyncMetadata,
  downloadMasterData,
  clearAllCache,
  getOfflineStatus,
  type CachedPart,
  type CachedLocation,
} from '../sync-store';

describe('sync-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.get.mockResolvedValue(undefined);
    mockDB.getAll.mockResolvedValue([]);
    mockDB.getAllFromIndex.mockResolvedValue([]);
    mockDB.getFromIndex.mockResolvedValue(undefined);
    mockDB.transaction.mockReturnValue({
      store: { put: vi.fn(), delete: vi.fn() },
      done: Promise.resolve(),
    });
  });

  describe('getDB', () => {
    it('should return a database instance', async () => {
      const db = await getDB();
      expect(db).toBeDefined();
    });
  });

  describe('cacheParts', () => {
    it('should put parts into the store', async () => {
      const parts: CachedPart[] = [
        {
          id: 'p1',
          partNumber: 'PN-001',
          description: 'Test Part',
          category: 'Raw',
          uom: 'pcs',
          onHand: 100,
          reserved: 10,
          available: 90,
          reorderPoint: 20,
          locations: [],
          updatedAt: Date.now(),
        },
      ];

      await cacheParts(parts);

      // Should have called transaction
      const db = await getDB();
      expect(db.transaction).toHaveBeenCalledWith('parts-cache', 'readwrite');
    });
  });

  describe('getCachedPart', () => {
    it('should get a part by ID', async () => {
      const part: CachedPart = {
        id: 'p1',
        partNumber: 'PN-001',
        description: 'Test',
        category: 'Raw',
        uom: 'pcs',
        onHand: 10,
        reserved: 0,
        available: 10,
        reorderPoint: 5,
        locations: [],
        updatedAt: Date.now(),
      };
      mockDB.get.mockResolvedValueOnce(part);

      const result = await getCachedPart('p1');
      expect(result).toEqual(part);
      expect(mockDB.get).toHaveBeenCalledWith('parts-cache', 'p1');
    });

    it('should return undefined when not found', async () => {
      mockDB.get.mockResolvedValueOnce(undefined);
      const result = await getCachedPart('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getCachedPartByNumber', () => {
    it('should query by index with uppercase part number', async () => {
      await getCachedPartByNumber('pn-001');
      expect(mockDB.getFromIndex).toHaveBeenCalledWith('parts-cache', 'by-number', 'PN-001');
    });
  });

  describe('searchCachedParts', () => {
    it('should filter parts by query string', async () => {
      mockDB.getAll.mockResolvedValueOnce([
        { id: 'p1', partNumber: 'PN-001', description: 'Bolt' },
        { id: 'p2', partNumber: 'PN-002', description: 'Nut' },
        { id: 'p3', partNumber: 'PN-003', description: 'Bolt large' },
      ]);

      const results = await searchCachedParts('bolt');
      expect(results).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      const parts = Array.from({ length: 30 }, (_, i) => ({
        id: `p${i}`,
        partNumber: `PN-${i}`,
        description: 'Match',
      }));
      mockDB.getAll.mockResolvedValueOnce(parts);

      const results = await searchCachedParts('match', 5);
      expect(results).toHaveLength(5);
    });
  });

  describe('getAllCachedParts', () => {
    it('should return all parts', async () => {
      mockDB.getAll.mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }]);
      const result = await getAllCachedParts();
      expect(result).toHaveLength(2);
    });
  });

  describe('cacheLocations', () => {
    it('should cache locations via transaction', async () => {
      const locations: CachedLocation[] = [
        {
          id: 'l1',
          code: 'LOC-01',
          name: 'Location 1',
          warehouseId: 'wh1',
          warehouseName: 'Main WH',
          zone: 'A',
          aisle: '1',
          rack: '1',
          shelf: '1',
        },
      ];

      await cacheLocations(locations);
      const db = await getDB();
      expect(db.transaction).toHaveBeenCalledWith('locations-cache', 'readwrite');
    });
  });

  describe('getCachedLocationByCode', () => {
    it('should query with uppercase code', async () => {
      await getCachedLocationByCode('loc-01');
      expect(mockDB.getFromIndex).toHaveBeenCalledWith('locations-cache', 'by-code', 'LOC-01');
    });
  });

  describe('getAllCachedLocations', () => {
    it('should return all locations', async () => {
      mockDB.getAll.mockResolvedValueOnce([{ id: 'l1' }]);
      const result = await getAllCachedLocations();
      expect(result).toHaveLength(1);
    });
  });

  describe('queueOperation', () => {
    it('should create a pending operation and return ID', async () => {
      // Mock syncPendingOperations behavior (called when online)
      mockDB.getAllFromIndex.mockResolvedValue([]);

      const id = await queueOperation('inventory_adjust', { qty: 10 });
      expect(id).toMatch(/^op-/);
      expect(mockDB.put).toHaveBeenCalledWith(
        'operations-queue',
        expect.objectContaining({
          type: 'inventory_adjust',
          status: 'pending',
          retryCount: 0,
        })
      );
    });
  });

  describe('getPendingOperationsCount', () => {
    it('should return count of pending operations', async () => {
      mockDB.getAllFromIndex.mockResolvedValueOnce([{ id: 'op-1' }, { id: 'op-2' }]);
      const count = await getPendingOperationsCount();
      expect(count).toBe(2);
    });
  });

  describe('getPendingOperations', () => {
    it('should return pending operations from index', async () => {
      mockDB.getAllFromIndex.mockResolvedValueOnce([{ id: 'op-1', status: 'pending' }]);
      const ops = await getPendingOperations();
      expect(ops).toHaveLength(1);
      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('operations-queue', 'by-status', 'pending');
    });
  });

  describe('updateOperationStatus', () => {
    it('should update an existing operation', async () => {
      const op = { id: 'op-1', status: 'pending', retryCount: 0, updatedAt: 1000 };
      mockDB.get.mockResolvedValueOnce(op);

      await updateOperationStatus('op-1', 'completed');

      expect(mockDB.put).toHaveBeenCalledWith(
        'operations-queue',
        expect.objectContaining({ id: 'op-1', status: 'completed' })
      );
    });

    it('should increment retryCount on error', async () => {
      const op = { id: 'op-1', status: 'pending', retryCount: 1, updatedAt: 1000 };
      mockDB.get.mockResolvedValueOnce(op);

      await updateOperationStatus('op-1', 'failed', 'Some error');

      expect(mockDB.put).toHaveBeenCalledWith(
        'operations-queue',
        expect.objectContaining({
          retryCount: 2,
          errorMessage: 'Some error',
        })
      );
    });

    it('should do nothing if operation not found', async () => {
      mockDB.get.mockResolvedValueOnce(undefined);
      await updateOperationStatus('nonexistent', 'completed');
      expect(mockDB.put).not.toHaveBeenCalled();
    });
  });

  describe('syncPendingOperations', () => {
    it('should return success/failed counts for empty queue', async () => {
      mockDB.getAllFromIndex.mockResolvedValueOnce([]);
      const result = await syncPendingOperations();
      expect(result).toEqual({ success: 0, failed: 0 });
    });

    it('should sync pending operations via fetch', async () => {
      const op = { id: 'op-1', type: 'inventory_adjust', data: {}, status: 'pending', retryCount: 0 };
      // getPendingOperations call
      mockDB.getAllFromIndex.mockResolvedValueOnce([op]);
      // updateOperationStatus calls need the op
      mockDB.get.mockResolvedValueOnce({ ...op, status: 'syncing' });
      mockDB.get.mockResolvedValueOnce({ ...op, status: 'syncing' });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('OK'),
      } as Response);

      const result = await syncPendingOperations();
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle fetch failure', async () => {
      const op = { id: 'op-2', type: 'inventory_count', data: {}, status: 'pending', retryCount: 0 };
      mockDB.getAllFromIndex.mockResolvedValueOnce([op]);
      mockDB.get.mockResolvedValue({ ...op });

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Server error'),
      } as Response);

      const result = await syncPendingOperations();
      expect(result.failed).toBe(1);
    });
  });

  describe('logScan', () => {
    it('should log a scan entry', async () => {
      mockDB.getAllFromIndex.mockResolvedValueOnce([]);

      await logScan('BC-001', 'part', 'inventory', 'success', 'entity-1');

      expect(mockDB.put).toHaveBeenCalledWith(
        'scan-history',
        expect.objectContaining({
          barcode: 'BC-001',
          type: 'part',
          context: 'inventory',
          result: 'success',
          entityId: 'entity-1',
        })
      );
    });

    it('should trim scan history to 500 entries', async () => {
      const scans = Array.from({ length: 510 }, (_, i) => ({ id: `scan-${i}` }));
      mockDB.getAllFromIndex.mockResolvedValueOnce(scans);

      const mockTxStore = { delete: vi.fn() };
      mockDB.transaction.mockReturnValueOnce({
        store: mockTxStore,
        done: Promise.resolve(),
      });

      await logScan('BC-002', 'part', 'count', 'success');

      // Should delete 10 oldest scans (510 - 500)
      expect(mockTxStore.delete).toHaveBeenCalledTimes(10);
    });
  });

  describe('getRecentScans', () => {
    it('should return recent scans in reverse order', async () => {
      mockDB.getAllFromIndex.mockResolvedValueOnce([
        { id: 's1', timestamp: 1 },
        { id: 's2', timestamp: 2 },
        { id: 's3', timestamp: 3 },
      ]);

      const result = await getRecentScans(2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('s3');
    });
  });

  describe('getSyncMetadata', () => {
    it('should retrieve sync metadata by key', async () => {
      mockDB.get.mockResolvedValueOnce({ key: 'parts', lastSync: 12345, recordCount: 100 });
      const result = await getSyncMetadata('parts');
      expect(result).toEqual({ key: 'parts', lastSync: 12345, recordCount: 100 });
    });
  });

  describe('getAllSyncMetadata', () => {
    it('should return all sync metadata', async () => {
      mockDB.getAll.mockResolvedValueOnce([
        { key: 'parts', lastSync: 1, recordCount: 10 },
        { key: 'locations', lastSync: 2, recordCount: 5 },
      ]);
      const result = await getAllSyncMetadata();
      expect(result).toHaveLength(2);
    });
  });

  describe('downloadMasterData', () => {
    it('should download and cache parts and locations', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 'p1', partNumber: 'PN-001' }]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 'l1', code: 'LOC-01' }]),
        } as Response);

      // getSyncMetadata returns
      mockDB.get.mockResolvedValueOnce({ key: 'parts', lastSync: 1, recordCount: 1 });
      mockDB.get.mockResolvedValueOnce({ key: 'locations', lastSync: 2, recordCount: 1 });

      const result = await downloadMasterData();
      expect(result.parts).toBe(1);
      expect(result.locations).toBe(1);
    });

    it('should throw on network error', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));
      await expect(downloadMasterData()).rejects.toThrow('Network error');
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache stores', async () => {
      await clearAllCache();
      expect(mockDB.clear).toHaveBeenCalledWith('parts-cache');
      expect(mockDB.clear).toHaveBeenCalledWith('locations-cache');
      expect(mockDB.clear).toHaveBeenCalledWith('scan-history');
      expect(mockDB.clear).toHaveBeenCalledWith('sync-metadata');
    });
  });

  describe('getOfflineStatus', () => {
    it('should return offline status summary', async () => {
      mockDB.get.mockResolvedValueOnce({ key: 'parts', lastSync: 1000, recordCount: 50 });
      mockDB.get.mockResolvedValueOnce({ key: 'locations', lastSync: 2000, recordCount: 10 });
      mockDB.getAllFromIndex.mockResolvedValueOnce([{ id: 'op-1' }]);

      const status = await getOfflineStatus();
      expect(status.isOnline).toBe(true);
      expect(status.pendingOperations).toBe(1);
      expect(status.cachedParts).toBe(50);
      expect(status.cachedLocations).toBe(10);
      expect(status.lastSync).toBe(1000);
    });

    it('should handle no sync metadata', async () => {
      mockDB.get.mockResolvedValue(undefined);
      mockDB.getAllFromIndex.mockResolvedValueOnce([]);

      const status = await getOfflineStatus();
      expect(status.cachedParts).toBe(0);
      expect(status.cachedLocations).toBe(0);
      expect(status.lastSync).toBeNull();
    });
  });
});
