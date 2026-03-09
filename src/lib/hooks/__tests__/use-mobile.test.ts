import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock client-logger
vi.mock('@/lib/client-logger', () => ({
  clientLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock @/lib/mobile
const mockParseBarcode = vi.fn();
const mockTriggerHaptic = vi.fn();
const mockPlayAudioFeedback = vi.fn();
const mockGetAvailableActions = vi.fn();
const mockQueueOperation = vi.fn();
const mockGetPendingOperationsCount = vi.fn();
const mockSyncPendingOperations = vi.fn();
const mockDownloadMasterData = vi.fn();
const mockGetOfflineStatus = vi.fn();
const mockLogScan = vi.fn();
const mockGetRecentScans = vi.fn();
const mockSearchCachedParts = vi.fn();
const mockGetCachedPartByNumber = vi.fn();

vi.mock('@/lib/mobile', () => ({
  parseScanBarcode: (...args: unknown[]) => mockParseBarcode(...args),
  triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
  playAudioFeedback: (...args: unknown[]) => mockPlayAudioFeedback(...args),
  getAvailableActions: (...args: unknown[]) => mockGetAvailableActions(...args),
  queueOperation: (...args: unknown[]) => mockQueueOperation(...args),
  getPendingOperationsCount: (...args: unknown[]) => mockGetPendingOperationsCount(...args),
  syncQueuedOperations: (...args: unknown[]) => mockSyncPendingOperations(...args),
  downloadMasterData: (...args: unknown[]) => mockDownloadMasterData(...args),
  getOfflineStatus: (...args: unknown[]) => mockGetOfflineStatus(...args),
  logScan: (...args: unknown[]) => mockLogScan(...args),
  getSyncRecentScans: (...args: unknown[]) => mockGetRecentScans(...args),
  searchCachedParts: (...args: unknown[]) => mockSearchCachedParts(...args),
  getCachedPartByNumber: (...args: unknown[]) => mockGetCachedPartByNumber(...args),
}));

import { useMobile } from '../use-mobile';

// =============================================================================
// HELPERS
// =============================================================================

function setupDefaultMocks() {
  mockGetPendingOperationsCount.mockResolvedValue(0);
  mockGetRecentScans.mockResolvedValue([]);
  mockGetOfflineStatus.mockResolvedValue({
    isOnline: true,
    pendingOperations: 0,
    cachedParts: 0,
    cachedLocations: 0,
    lastSync: null,
  });
  mockLogScan.mockResolvedValue(undefined);
  mockSyncPendingOperations.mockResolvedValue({ success: 0, failed: 0 });
}

describe('useMobile', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockReset();
    setupDefaultMocks();

    Object.defineProperty(global, 'navigator', {
      value: { onLine: true, userAgent: 'test' },
      configurable: true,
      writable: true,
    });
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('starts with online state from navigator', async () => {
      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });

    it('starts with zero pending count', async () => {
      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(0);
      });
    });

    it('starts with isSyncing false', () => {
      const { result } = renderHook(() => useMobile());
      expect(result.current.isSyncing).toBe(false);
    });

    it('starts with empty recent scans', () => {
      const { result } = renderHook(() => useMobile());
      expect(result.current.recentScans).toEqual([]);
    });

    it('loads initial data on mount', async () => {
      mockGetPendingOperationsCount.mockResolvedValue(3);
      mockGetRecentScans.mockResolvedValue([{ id: '1', barcode: 'TEST' }]);
      mockGetOfflineStatus.mockResolvedValue({
        isOnline: true,
        pendingOperations: 3,
        cachedParts: 10,
        cachedLocations: 5,
        lastSync: Date.now(),
      });

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.pendingCount).toBe(3);
        expect(result.current.recentScans).toHaveLength(1);
        expect(result.current.offlineStatus).not.toBeNull();
      });
    });
  });

  // ===========================================================================
  // Online/Offline detection
  // ===========================================================================

  describe('online/offline detection', () => {
    it('goes offline when offline event fires', async () => {
      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('goes back online when online event fires', async () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  // ===========================================================================
  // processScan
  // ===========================================================================

  describe('processScan', () => {
    it('resolves via API when online', async () => {
      mockParseBarcode.mockReturnValue({
        type: 'PART',
        value: 'CMP-001',
        format: 'CODE128',
        confidence: 1,
      });

      const apiResponse = {
        success: true,
        scan: { raw: 'CMP-001', type: 'PART', value: 'CMP-001', format: 'CODE128', confidence: 1 },
        resolved: true,
        entity: { id: 'p1', partNumber: 'CMP-001' },
        actions: ['view', 'adjust'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse,
      });

      mockGetRecentScans.mockResolvedValue([]);

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      let scanResult: unknown;
      await act(async () => {
        scanResult = await result.current.processScan('CMP-001');
      });

      expect(scanResult).toEqual(apiResponse);
      expect(mockTriggerHaptic).toHaveBeenCalledWith('success');
      expect(mockPlayAudioFeedback).toHaveBeenCalledWith('success');
      expect(mockLogScan).toHaveBeenCalled();
    });

    it('falls back to local cache when offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });

      mockParseBarcode.mockReturnValue({
        type: 'PART',
        value: 'CMP-001',
        format: 'CODE128',
        confidence: 0.9,
      });

      mockGetCachedPartByNumber.mockResolvedValue({
        id: 'p1',
        partNumber: 'CMP-001',
        partName: 'Test Part',
      });

      mockGetAvailableActions.mockReturnValue(['view']);
      mockGetRecentScans.mockResolvedValue([]);

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      let scanResult: Record<string, unknown>;
      await act(async () => {
        scanResult = await result.current.processScan('CMP-001', 'inventory') as unknown as Record<string, unknown>;
      });

      expect(scanResult!.success).toBe(true);
      expect(scanResult!.resolved).toBe(true);
      expect(scanResult!.entity).toBeDefined();
      expect(mockTriggerHaptic).toHaveBeenCalledWith('success');
    });

    it('returns unresolved when offline and not cached', async () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });

      mockParseBarcode.mockReturnValue({
        type: 'UNKNOWN',
        value: 'XYZ',
        format: 'UNKNOWN',
        confidence: 0.5,
      });

      mockGetCachedPartByNumber.mockResolvedValue(null);
      mockGetAvailableActions.mockReturnValue([]);
      mockGetRecentScans.mockResolvedValue([]);

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      let scanResult: Record<string, unknown>;
      await act(async () => {
        scanResult = await result.current.processScan('XYZ') as unknown as Record<string, unknown>;
      });

      expect(scanResult!.success).toBe(true);
      expect(scanResult!.resolved).toBe(false);
      expect(scanResult!.entity).toBeNull();
      expect(mockTriggerHaptic).toHaveBeenCalledWith('warning');
    });

    it('handles scan error gracefully', async () => {
      mockParseBarcode.mockImplementation(() => {
        throw new Error('Parse failed');
      });

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      let scanResult: Record<string, unknown>;
      await act(async () => {
        scanResult = await result.current.processScan('BAD') as unknown as Record<string, unknown>;
      });

      expect(scanResult!.success).toBe(false);
      expect(scanResult!.error).toBe('Parse failed');
      expect(mockTriggerHaptic).toHaveBeenCalledWith('error');
      expect(mockPlayAudioFeedback).toHaveBeenCalledWith('error');
    });

    it('disables haptics when option is false', async () => {
      mockParseBarcode.mockImplementation(() => {
        throw new Error('fail');
      });

      const { result } = renderHook(() => useMobile({ enableHaptics: false }));

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      await act(async () => {
        await result.current.processScan('TEST');
      });

      expect(mockTriggerHaptic).not.toHaveBeenCalled();
    });

    it('disables audio when option is false', async () => {
      mockParseBarcode.mockImplementation(() => {
        throw new Error('fail');
      });

      const { result } = renderHook(() => useMobile({ enableAudio: false }));

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      await act(async () => {
        await result.current.processScan('TEST');
      });

      expect(mockPlayAudioFeedback).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // searchParts
  // ===========================================================================

  describe('searchParts', () => {
    it('searches via API when online', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: '1', partNumber: 'CMP-001' }] }),
      });

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      let parts: unknown[];
      await act(async () => {
        parts = await result.current.searchParts('CMP');
      });

      expect(parts!).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/mobile/inventory?search=CMP');
    });

    it('falls back to local search when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockSearchCachedParts.mockResolvedValue([{ id: '1', partNumber: 'CMP-001' }]);

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      let parts: unknown[];
      await act(async () => {
        parts = await result.current.searchParts('CMP');
      });

      expect(parts!).toHaveLength(1);
      expect(mockSearchCachedParts).toHaveBeenCalledWith('CMP');
    });

    it('uses local search when offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });
      mockSearchCachedParts.mockResolvedValue([{ id: '1' }]);

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      let parts: unknown[];
      await act(async () => {
        parts = await result.current.searchParts('test');
      });

      expect(parts!).toHaveLength(1);
      expect(mockSearchCachedParts).toHaveBeenCalledWith('test');
      expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/mobile/inventory'));
    });
  });

  // ===========================================================================
  // submitOperation
  // ===========================================================================

  describe('submitOperation', () => {
    it('submits via API when online', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactionId: 'tx-1' }),
      });

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      let opResult: Record<string, unknown>;
      await act(async () => {
        opResult = await result.current.submitOperation('inventory_adjust', { partId: 'p1', quantity: 10 });
      });

      expect(opResult!.success).toBe(true);
      expect(opResult!.id).toBe('tx-1');
      expect(opResult!.queued).toBe(false);
      expect(mockTriggerHaptic).toHaveBeenCalledWith('success');
    });

    it('queues operation when offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });
      mockQueueOperation.mockResolvedValue('queued-1');
      mockGetPendingOperationsCount.mockResolvedValue(1);

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      let opResult: Record<string, unknown>;
      await act(async () => {
        opResult = await result.current.submitOperation('inventory_adjust', { partId: 'p1' });
      });

      expect(opResult!.success).toBe(true);
      expect(opResult!.id).toBe('queued-1');
      expect(opResult!.queued).toBe(true);
      expect(mockQueueOperation).toHaveBeenCalledWith('inventory_adjust', { partId: 'p1' });
    });

    it('queues operation when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Server error'));
      mockQueueOperation.mockResolvedValue('queued-2');
      mockGetPendingOperationsCount.mockResolvedValue(1);

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      let opResult: Record<string, unknown>;
      await act(async () => {
        opResult = await result.current.submitOperation('po_receive', { poId: 'po-1' });
      });

      expect(opResult!.queued).toBe(true);
    });
  });

  // ===========================================================================
  // sync
  // ===========================================================================

  describe('sync', () => {
    it('syncs pending operations when online', async () => {
      mockSyncPendingOperations.mockResolvedValue({ success: 3, failed: 0 });
      mockGetPendingOperationsCount.mockResolvedValue(0);

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      let syncResult: Record<string, unknown>;
      await act(async () => {
        syncResult = await result.current.sync();
      });

      expect(syncResult!.success).toBe(3);
      expect(syncResult!.failed).toBe(0);
      expect(mockTriggerHaptic).toHaveBeenCalledWith('success');
    });

    it('returns zero results when offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      let syncResult: Record<string, unknown>;
      await act(async () => {
        syncResult = await result.current.sync();
      });

      expect(syncResult!.success).toBe(0);
      expect(syncResult!.failed).toBe(0);
      expect(mockSyncPendingOperations).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // downloadData
  // ===========================================================================

  describe('downloadData', () => {
    it('downloads master data when online', async () => {
      mockDownloadMasterData.mockResolvedValue({ parts: 100, locations: 20 });
      mockGetOfflineStatus.mockResolvedValue({
        isOnline: true,
        pendingOperations: 0,
        cachedParts: 100,
        cachedLocations: 20,
        lastSync: Date.now(),
      });

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      let downloadResult: Record<string, unknown>;
      await act(async () => {
        downloadResult = await result.current.downloadData();
      });

      expect(downloadResult!.parts).toBe(100);
      expect(downloadResult!.locations).toBe(20);
      expect(mockTriggerHaptic).toHaveBeenCalledWith('success');
    });

    it('throws when offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });

      const { result } = renderHook(() => useMobile());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      await act(async () => {
        await expect(result.current.downloadData()).rejects.toThrow('Cannot download while offline');
      });
    });
  });

  // ===========================================================================
  // refreshStatus
  // ===========================================================================

  describe('refreshStatus', () => {
    it('refreshes offline status and updates pendingCount', async () => {
      const newStatus = {
        isOnline: true,
        pendingOperations: 5,
        cachedParts: 50,
        cachedLocations: 10,
        lastSync: Date.now(),
      };
      // Set the mock so BOTH initial load and refresh return same value
      mockGetOfflineStatus.mockResolvedValue(newStatus);
      mockGetPendingOperationsCount.mockResolvedValue(5);

      const { result } = renderHook(() => useMobile());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.offlineStatus).not.toBeNull();
      });

      // Call refreshStatus
      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.offlineStatus).toEqual(newStatus);
      expect(result.current.pendingCount).toBe(5);
    });
  });

  // ===========================================================================
  // Utility passthrough
  // ===========================================================================

  describe('utility passthrough', () => {
    it('exposes triggerHaptic when haptics enabled', () => {
      const { result } = renderHook(() => useMobile({ enableHaptics: true }));

      result.current.triggerHaptic('success' as never);
      expect(mockTriggerHaptic).toHaveBeenCalledWith('success');
    });

    it('provides noop triggerHaptic when haptics disabled', () => {
      const { result } = renderHook(() => useMobile({ enableHaptics: false }));

      result.current.triggerHaptic('success' as never);
      expect(mockTriggerHaptic).not.toHaveBeenCalled();
    });

    it('exposes playAudio when audio enabled', () => {
      const { result } = renderHook(() => useMobile({ enableAudio: true }));

      result.current.playAudio('success' as never);
      expect(mockPlayAudioFeedback).toHaveBeenCalledWith('success');
    });

    it('provides noop playAudio when audio disabled', () => {
      const { result } = renderHook(() => useMobile({ enableAudio: false }));

      result.current.playAudio('success' as never);
      expect(mockPlayAudioFeedback).not.toHaveBeenCalled();
    });
  });
});
