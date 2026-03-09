import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must use vi.hoisted for variables used in vi.mock factories
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
    add: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    countFromIndex: vi.fn().mockResolvedValue(0),
    transaction: vi.fn().mockReturnValue(mockTx),
  };
  return { mockStore, mockTx, mockDB };
});

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockDB),
}));

import {
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
} from '../offline-store';

describe('offline-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDB.get.mockResolvedValue(undefined);
    mockDB.getAll.mockResolvedValue([]);
    mockDB.getAllFromIndex.mockResolvedValue([]);
    mockDB.getFromIndex.mockResolvedValue(undefined);
    mockDB.count.mockResolvedValue(0);
    mockDB.countFromIndex.mockResolvedValue(0);
    mockDB.transaction.mockReturnValue({
      store: { put: vi.fn(), delete: vi.fn() },
      done: Promise.resolve(),
    });
  });

  describe('initDB / getDB', () => {
    it('should return a database instance', async () => {
      const db = await initDB();
      expect(db).toBeDefined();
    });

    it('should return same instance on subsequent calls', async () => {
      const db1 = await getDB();
      const db2 = await getDB();
      expect(db1).toBe(db2);
    });
  });

  describe('Parts operations', () => {
    const samplePart = {
      id: 'p1',
      sku: 'SKU-001',
      name: 'Test Part',
      uom: 'pcs',
      cachedAt: new Date(),
    };

    it('cachePart should put a part with current date', async () => {
      await cachePart(samplePart);
      expect(mockDB.put).toHaveBeenCalledWith(
        'parts',
        expect.objectContaining({ id: 'p1', sku: 'SKU-001' })
      );
    });

    it('cacheParts should put multiple parts in a transaction', async () => {
      await cacheParts([samplePart, { ...samplePart, id: 'p2', sku: 'SKU-002' }]);
      expect(mockDB.transaction).toHaveBeenCalledWith('parts', 'readwrite');
    });

    it('getPartById should get by key', async () => {
      mockDB.get.mockResolvedValueOnce(samplePart);
      const result = await getPartById('p1');
      expect(result).toEqual(samplePart);
      expect(mockDB.get).toHaveBeenCalledWith('parts', 'p1');
    });

    it('getPartBySku should query by-sku index', async () => {
      mockDB.getFromIndex.mockResolvedValueOnce(samplePart);
      const result = await getPartBySku('SKU-001');
      expect(result).toEqual(samplePart);
      expect(mockDB.getFromIndex).toHaveBeenCalledWith('parts', 'by-sku', 'SKU-001');
    });

    it('searchParts should filter by sku and name', async () => {
      mockDB.getAll.mockResolvedValueOnce([
        { id: 'p1', sku: 'BOLT-001', name: 'Hex Bolt' },
        { id: 'p2', sku: 'NUT-001', name: 'Hex Nut' },
        { id: 'p3', sku: 'BOLT-002', name: 'Carriage Bolt' },
      ]);

      const results = await searchParts('bolt');
      expect(results).toHaveLength(2);
    });
  });

  describe('Locations operations', () => {
    const sampleLocation = {
      id: 'l1',
      code: 'LOC-A1',
      name: 'Aisle A Rack 1',
      warehouseId: 'wh1',
      warehouseName: 'Main',
      cachedAt: new Date(),
    };

    it('cacheLocation should put a location', async () => {
      await cacheLocation(sampleLocation);
      expect(mockDB.put).toHaveBeenCalledWith(
        'locations',
        expect.objectContaining({ id: 'l1' })
      );
    });

    it('cacheLocations should put multiple via transaction', async () => {
      await cacheLocations([sampleLocation]);
      expect(mockDB.transaction).toHaveBeenCalledWith('locations', 'readwrite');
    });

    it('getLocationById should get by key', async () => {
      mockDB.get.mockResolvedValueOnce(sampleLocation);
      const result = await getLocationById('l1');
      expect(result).toEqual(sampleLocation);
    });

    it('getLocationByCode should query by-code index', async () => {
      mockDB.getFromIndex.mockResolvedValueOnce(sampleLocation);
      const result = await getLocationByCode('LOC-A1');
      expect(mockDB.getFromIndex).toHaveBeenCalledWith('locations', 'by-code', 'LOC-A1');
      expect(result).toEqual(sampleLocation);
    });
  });

  describe('Work orders operations', () => {
    it('cacheWorkOrder should put a work order', async () => {
      await cacheWorkOrder({
        id: 'wo1',
        number: 'WO-001',
        productId: 'prod1',
        productName: 'Widget',
        quantity: 100,
        status: 'RELEASED',
        cachedAt: new Date(),
      });
      expect(mockDB.put).toHaveBeenCalledWith(
        'workOrders',
        expect.objectContaining({ id: 'wo1' })
      );
    });

    it('getWorkOrderById should get by key', async () => {
      const wo = { id: 'wo1', status: 'RELEASED' };
      mockDB.get.mockResolvedValueOnce(wo);
      const result = await getWorkOrderById('wo1');
      expect(result).toEqual(wo);
    });

    it('getActiveWorkOrders should filter by RELEASED and IN_PROGRESS', async () => {
      mockDB.getAll.mockResolvedValueOnce([
        { id: 'wo1', status: 'RELEASED' },
        { id: 'wo2', status: 'IN_PROGRESS' },
        { id: 'wo3', status: 'COMPLETED' },
        { id: 'wo4', status: 'CANCELLED' },
      ]);

      const result = await getActiveWorkOrders();
      expect(result).toHaveLength(2);
      expect(result.map(w => w.id)).toEqual(['wo1', 'wo2']);
    });
  });

  describe('Offline operations', () => {
    it('queueOfflineOperation should add with pending status', async () => {
      const id = await queueOfflineOperation({
        operationType: 'INVENTORY_ADJUSTMENT',
        entityType: 'inventory',
        payload: { partId: 'p1', qty: 5 },
      });

      expect(id).toMatch(/^op-/);
      expect(mockDB.add).toHaveBeenCalledWith(
        'offlineOperations',
        expect.objectContaining({
          status: 'pending',
          attempts: 0,
          operationType: 'INVENTORY_ADJUSTMENT',
        })
      );
    });

    it('getPendingOperations should query by-status index', async () => {
      mockDB.getAllFromIndex.mockResolvedValueOnce([{ id: 'op-1' }]);
      const ops = await getPendingOperations();
      expect(ops).toHaveLength(1);
      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('offlineOperations', 'by-status', 'pending');
    });

    it('updateOperationStatus should update an existing op', async () => {
      const op = { id: 'op-1', status: 'pending', attempts: 0 };
      mockDB.get.mockResolvedValueOnce(op);

      await updateOperationStatus('op-1', 'completed');

      expect(mockDB.put).toHaveBeenCalledWith(
        'offlineOperations',
        expect.objectContaining({
          id: 'op-1',
          status: 'completed',
          attempts: 1,
        })
      );
    });

    it('updateOperationStatus should store error message', async () => {
      const op = { id: 'op-1', status: 'syncing', attempts: 1 };
      mockDB.get.mockResolvedValueOnce(op);

      await updateOperationStatus('op-1', 'failed', 'Connection timeout');

      expect(mockDB.put).toHaveBeenCalledWith(
        'offlineOperations',
        expect.objectContaining({
          lastError: 'Connection timeout',
          attempts: 2,
        })
      );
    });

    it('updateOperationStatus should do nothing if op not found', async () => {
      mockDB.get.mockResolvedValueOnce(undefined);
      await updateOperationStatus('nonexistent', 'completed');
      expect(mockDB.put).not.toHaveBeenCalled();
    });

    it('deleteCompletedOperations should delete old completed ops', async () => {
      const oldDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      mockDB.getAll.mockResolvedValueOnce([
        { id: 'op-1', status: 'completed', syncedAt: oldDate },
        { id: 'op-2', status: 'pending', syncedAt: null },
        { id: 'op-3', status: 'completed', syncedAt: new Date() },
      ]);

      const mockTxStore = { delete: vi.fn() };
      mockDB.transaction.mockReturnValueOnce({
        store: mockTxStore,
        done: Promise.resolve(),
      });

      await deleteCompletedOperations();

      // Only op-1 should be deleted (completed + old syncedAt)
      expect(mockTxStore.delete).toHaveBeenCalledTimes(1);
      expect(mockTxStore.delete).toHaveBeenCalledWith('op-1');
    });
  });

  describe('Scan history', () => {
    it('addScanHistory should add a scan entry', async () => {
      const id = await addScanHistory({
        barcode: 'BC-001',
        barcodeType: 'CODE128',
        entityType: 'part',
      });

      expect(id).toMatch(/^scan-/);
      expect(mockDB.add).toHaveBeenCalledWith(
        'scanHistory',
        expect.objectContaining({
          barcode: 'BC-001',
          synced: false,
        })
      );
    });

    it('getRecentScans should return scans in reverse order', async () => {
      mockDB.getAllFromIndex.mockResolvedValueOnce([
        { id: 's1', scannedAt: new Date(1000) },
        { id: 's2', scannedAt: new Date(2000) },
        { id: 's3', scannedAt: new Date(3000) },
      ]);

      const result = await getRecentScans(2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('s3');
    });

    it('getRecentScans should default to 50 limit', async () => {
      const scans = Array.from({ length: 60 }, (_, i) => ({
        id: `s${i}`,
        scannedAt: new Date(i * 1000),
      }));
      mockDB.getAllFromIndex.mockResolvedValueOnce(scans);

      const result = await getRecentScans();
      expect(result).toHaveLength(50);
    });
  });

  describe('Settings', () => {
    it('setSetting should put a setting', async () => {
      await setSetting('theme', 'dark');
      expect(mockDB.put).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({ key: 'theme', value: 'dark' })
      );
    });

    it('getSetting should return setting value', async () => {
      mockDB.get.mockResolvedValueOnce({ key: 'theme', value: 'dark', updatedAt: new Date() });
      const result = await getSetting<string>('theme');
      expect(result).toBe('dark');
    });

    it('getSetting should return undefined for missing key', async () => {
      mockDB.get.mockResolvedValueOnce(undefined);
      const result = await getSetting('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('Pick lists', () => {
    const samplePickList = {
      id: 'pl1',
      pickListNumber: 'PL-001',
      status: 'PENDING',
      lines: [],
      cachedAt: new Date(),
    };

    it('cachePickList should put a pick list', async () => {
      await cachePickList(samplePickList);
      expect(mockDB.put).toHaveBeenCalledWith(
        'pickLists',
        expect.objectContaining({ id: 'pl1' })
      );
    });

    it('getPickListById should get by key', async () => {
      mockDB.get.mockResolvedValueOnce(samplePickList);
      const result = await getPickListById('pl1');
      expect(result).toEqual(samplePickList);
    });

    it('getActivePickLists should filter by PENDING and IN_PROGRESS', async () => {
      mockDB.getAll.mockResolvedValueOnce([
        { id: 'pl1', status: 'PENDING' },
        { id: 'pl2', status: 'IN_PROGRESS' },
        { id: 'pl3', status: 'COMPLETED' },
      ]);

      const result = await getActivePickLists();
      expect(result).toHaveLength(2);
    });
  });

  describe('Cache management', () => {
    it('clearCache with specific store should clear only that store', async () => {
      await clearCache('parts');
      expect(mockDB.clear).toHaveBeenCalledWith('parts');
      expect(mockDB.clear).toHaveBeenCalledTimes(1);
    });

    it('clearCache without arg should clear all except settings and offlineOperations', async () => {
      await clearCache();
      expect(mockDB.clear).toHaveBeenCalledWith('parts');
      expect(mockDB.clear).toHaveBeenCalledWith('locations');
      expect(mockDB.clear).toHaveBeenCalledWith('workOrders');
      expect(mockDB.clear).toHaveBeenCalledWith('scanHistory');
      expect(mockDB.clear).toHaveBeenCalledWith('pickLists');
      expect(mockDB.clear).not.toHaveBeenCalledWith('settings');
      expect(mockDB.clear).not.toHaveBeenCalledWith('offlineOperations');
    });

    it('getCacheStats should return counts for all stores', async () => {
      mockDB.count
        .mockResolvedValueOnce(10)  // parts
        .mockResolvedValueOnce(5)   // locations
        .mockResolvedValueOnce(3)   // workOrders
        .mockResolvedValueOnce(2)   // scans
        .mockResolvedValueOnce(1);  // pickLists
      mockDB.countFromIndex.mockResolvedValueOnce(4); // pendingOps

      const stats = await getCacheStats();
      expect(stats.parts).toBe(10);
      expect(stats.locations).toBe(5);
      expect(stats.workOrders).toBe(3);
      expect(stats.pendingOps).toBe(4);
      expect(stats.scans).toBe(2);
      expect(stats.pickLists).toBe(1);
    });
  });
});
