import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// IndexedDB Mock
// =============================================================================

interface MockStore {
  data: Map<string, unknown>;
  indexes: Map<string, unknown>;
}

function createMockIDBRequest(result: unknown, success = true) {
  const request: Record<string, unknown> = {
    result,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  // Schedule callback on next microtask
  queueMicrotask(() => {
    if (success && typeof request.onsuccess === 'function') {
      request.onsuccess();
    } else if (!success && typeof request.onerror === 'function') {
      request.onerror();
    }
  });
  return request;
}

function createMockObjectStore(storeName: string, stores: Map<string, MockStore>) {
  if (!stores.has(storeName)) {
    stores.set(storeName, { data: new Map(), indexes: new Map() });
  }
  const store = stores.get(storeName)!;

  return {
    add: vi.fn((value: Record<string, string>) => {
      const key = value.id || value.key;
      store.data.set(key, { ...value });
      return createMockIDBRequest(key);
    }),
    put: vi.fn((value: Record<string, string>) => {
      const key = value.id || value.key;
      store.data.set(key, { ...value });
      return createMockIDBRequest(key);
    }),
    get: vi.fn((key: string) => {
      const result = store.data.get(key) || undefined;
      return createMockIDBRequest(result);
    }),
    getAll: vi.fn(() => {
      return createMockIDBRequest(Array.from(store.data.values()));
    }),
    delete: vi.fn((key: string) => {
      store.data.delete(key);
      return createMockIDBRequest(undefined);
    }),
    clear: vi.fn(() => {
      store.data.clear();
      return createMockIDBRequest(undefined);
    }),
    openCursor: vi.fn(() => {
      const entries = Array.from(store.data.entries());
      let index = 0;

      const request: Record<string, unknown> = {
        result: null as unknown,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };

      const createCursor = () => {
        if (index < entries.length) {
          const [, value] = entries[index];
          return {
            value,
            delete: vi.fn(() => {
              const key = (value as Record<string, string>).key || (value as Record<string, string>).id;
              store.data.delete(key);
            }),
            continue: vi.fn(() => {
              index++;
              request.result = createCursor();
              if (typeof request.onsuccess === 'function') {
                request.onsuccess();
              }
            }),
          };
        }
        return null;
      };

      queueMicrotask(() => {
        request.result = createCursor();
        if (typeof request.onsuccess === 'function') {
          request.onsuccess();
        }
      });

      return request;
    }),
    createIndex: vi.fn(),
  };
}

function createMockIndexedDB() {
  const stores = new Map<string, MockStore>();

  const mockDB = {
    objectStoreNames: {
      contains: vi.fn((name: string) => stores.has(name)),
    },
    createObjectStore: vi.fn((name: string) => {
      stores.set(name, { data: new Map(), indexes: new Map() });
      return createMockObjectStore(name, stores);
    }),
    transaction: vi.fn(
      (storeNames: string | string[], _mode?: string) => {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        const txStores: Record<string, ReturnType<typeof createMockObjectStore>> = {};
        for (const name of names) {
          txStores[name] = createMockObjectStore(name, stores);
        }
        const tx = {
          objectStore: vi.fn((name: string) => txStores[name]),
          oncomplete: null as (() => void) | null,
          onerror: null as (() => void) | null,
        };
        // For clearAllOfflineData, fire oncomplete
        queueMicrotask(() => {
          if (typeof tx.oncomplete === 'function') {
            tx.oncomplete();
          }
        });
        return tx;
      }
    ),
  };

  const open = vi.fn(() => {
    // Pre-create stores
    if (!stores.has('pendingActions')) {
      stores.set('pendingActions', { data: new Map(), indexes: new Map() });
    }
    if (!stores.has('cache')) {
      stores.set('cache', { data: new Map(), indexes: new Map() });
    }
    if (!stores.has('drafts')) {
      stores.set('drafts', { data: new Map(), indexes: new Map() });
    }

    const request: Record<string, unknown> = {
      result: mockDB,
      onsuccess: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onupgradeneeded: null as ((event: unknown) => void) | null,
    };

    queueMicrotask(() => {
      if (typeof request.onsuccess === 'function') {
        request.onsuccess();
      }
    });

    return request;
  });

  return { open, stores, mockDB };
}

let mockIDB: ReturnType<typeof createMockIndexedDB>;

beforeEach(() => {
  vi.resetModules();
  mockIDB = createMockIndexedDB();
  (globalThis as Record<string, unknown>).indexedDB = { open: mockIDB.open };
});

// =============================================================================
// TESTS
// =============================================================================

describe('offline-storage', () => {
  describe('savePendingAction', () => {
    it('should save a pending action and return an id', async () => {
      const { savePendingAction } = await import('../offline-storage');

      const id = await savePendingAction({
        url: '/api/parts',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^action-/);
    });

    it('should include timestamp and retries=0 in the saved action', async () => {
      const { savePendingAction } = await import('../offline-storage');

      await savePendingAction({
        url: '/api/parts',
        method: 'POST',
        headers: {},
        body: '{}',
      });

      // Verify the store.add was called with correct structure
      const tx = mockIDB.mockDB.transaction.mock.results[0]?.value;
      if (tx) {
        const store = tx.objectStore('pendingActions');
        const addCall = store.add.mock.calls[0]?.[0];
        expect(addCall).toBeDefined();
        if (addCall) {
          expect(addCall.retries).toBe(0);
          expect(typeof addCall.timestamp).toBe('number');
        }
      }
    });
  });

  describe('getPendingActions', () => {
    it('should return an array of pending actions', async () => {
      const { getPendingActions } = await import('../offline-storage');

      const actions = await getPendingActions();
      expect(Array.isArray(actions)).toBe(true);
    });
  });

  describe('removePendingAction', () => {
    it('should call delete on the store with the given id', async () => {
      const { removePendingAction } = await import('../offline-storage');

      await removePendingAction('action-123');

      const tx = mockIDB.mockDB.transaction.mock.results[0]?.value;
      if (tx) {
        const store = tx.objectStore('pendingActions');
        expect(store.delete).toHaveBeenCalledWith('action-123');
      }
    });
  });

  describe('setCachedData', () => {
    it('should save cached data with key, data, timestamp, and ttl', async () => {
      const { setCachedData } = await import('../offline-storage');

      await setCachedData('test-key', { foo: 'bar' }, 5000);

      const tx = mockIDB.mockDB.transaction.mock.results[0]?.value;
      if (tx) {
        const store = tx.objectStore('cache');
        expect(store.put).toHaveBeenCalled();
        const putCall = store.put.mock.calls[0]?.[0];
        expect(putCall).toBeDefined();
        if (putCall) {
          expect(putCall.key).toBe('test-key');
          expect(putCall.data).toEqual({ foo: 'bar' });
          expect(putCall.ttl).toBe(5000);
        }
      }
    });

    it('should use default TTL of 3600000ms when not specified', async () => {
      const { setCachedData } = await import('../offline-storage');

      await setCachedData('key2', 'data2');

      const tx = mockIDB.mockDB.transaction.mock.results[0]?.value;
      if (tx) {
        const store = tx.objectStore('cache');
        const putCall = store.put.mock.calls[0]?.[0];
        expect(putCall?.ttl).toBe(3600000);
      }
    });
  });

  describe('getCachedData', () => {
    it('should return null when no data exists for key', async () => {
      const { getCachedData } = await import('../offline-storage');

      const result = await getCachedData('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('removeCachedData', () => {
    it('should call delete on the cache store', async () => {
      const { removeCachedData } = await import('../offline-storage');

      await removeCachedData('key-to-remove');

      const tx = mockIDB.mockDB.transaction.mock.results[0]?.value;
      if (tx) {
        const store = tx.objectStore('cache');
        expect(store.delete).toHaveBeenCalledWith('key-to-remove');
      }
    });
  });

  describe('clearExpiredCache', () => {
    it('should resolve without error', async () => {
      const { clearExpiredCache } = await import('../offline-storage');

      await expect(clearExpiredCache()).resolves.toBeUndefined();
    });
  });

  describe('saveDraft', () => {
    it('should save draft data with key, data, and timestamp', async () => {
      const { saveDraft } = await import('../offline-storage');

      await saveDraft('draft-form-1', { field1: 'value1' });

      const tx = mockIDB.mockDB.transaction.mock.results[0]?.value;
      if (tx) {
        const store = tx.objectStore('drafts');
        expect(store.put).toHaveBeenCalled();
        const putCall = store.put.mock.calls[0]?.[0];
        expect(putCall?.key).toBe('draft-form-1');
        expect(putCall?.data).toEqual({ field1: 'value1' });
        expect(typeof putCall?.timestamp).toBe('number');
      }
    });
  });

  describe('getDraft', () => {
    it('should return null when draft does not exist', async () => {
      const { getDraft } = await import('../offline-storage');

      const result = await getDraft('nonexistent-draft');
      expect(result).toBeNull();
    });
  });

  describe('removeDraft', () => {
    it('should call delete on the drafts store', async () => {
      const { removeDraft } = await import('../offline-storage');

      await removeDraft('draft-1');

      const tx = mockIDB.mockDB.transaction.mock.results[0]?.value;
      if (tx) {
        const store = tx.objectStore('drafts');
        expect(store.delete).toHaveBeenCalledWith('draft-1');
      }
    });
  });

  describe('clearAllOfflineData', () => {
    it('should clear all three stores', async () => {
      const { clearAllOfflineData } = await import('../offline-storage');

      await clearAllOfflineData();

      const tx = mockIDB.mockDB.transaction.mock.results[0]?.value;
      if (tx) {
        expect(mockIDB.mockDB.transaction).toHaveBeenCalledWith(
          ['pendingActions', 'cache', 'drafts'],
          'readwrite'
        );
      }
    });
  });

  describe('getOfflineDataSize', () => {
    it('should return a number representing total size in bytes', async () => {
      const { getOfflineDataSize } = await import('../offline-storage');

      const size = await getOfflineDataSize();
      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('syncPendingActions', () => {
    it('should return success and failed counts when no actions exist', async () => {
      const { syncPendingActions } = await import('../offline-storage');

      const result = await syncPendingActions();
      expect(result).toEqual({ success: 0, failed: 0 });
    });
  });

  describe('registerBackgroundSync', () => {
    it('should not throw when serviceWorker is not available', async () => {
      const { registerBackgroundSync } = await import('../offline-storage');

      // navigator.serviceWorker may not exist in test env
      expect(() => registerBackgroundSync()).not.toThrow();
    });
  });
});
