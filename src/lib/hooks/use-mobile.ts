'use client';

// ═══════════════════════════════════════════════════════════════════
//                    USE MOBILE HOOK
//              React hook for mobile features
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { clientLogger } from '@/lib/client-logger';
import {
  parseScanBarcode as parseBarcode,
  triggerHaptic,
  playAudioFeedback,
  getAvailableActions,
  queueOperation,
  getPendingOperationsCount,
  syncQueuedOperations as syncPendingOperations,
  downloadMasterData,
  getOfflineStatus,
  logScan,
  getSyncRecentScans as getRecentScans,
  searchCachedParts,
  getCachedPartByNumber,
  type ScannerScanResult as ScanResult,
  type OperationType,
  type ScanHistoryItem,
  type CachedPart,
} from '@/lib/mobile';

// Types
interface ScanResponse {
  success: boolean;
  scan: {
    raw: string;
    type: string;
    value: string;
    format: string;
    confidence: number;
  };
  resolved: boolean;
  entity: Record<string, unknown> | null;
  actions: string[];
  error?: string;
}

interface OfflineStatus {
  isOnline: boolean;
  pendingOperations: number;
  cachedParts: number;
  cachedLocations: number;
  lastSync: number | null;
}

interface UseMobileOptions {
  enableHaptics?: boolean;
  enableAudio?: boolean;
  autoSync?: boolean;
}

/**
 * Hook for mobile features
 */
export function useMobile(options: UseMobileOptions = {}) {
  const {
    enableHaptics = true,
    enableAudio = true,
    autoSync = true,
  } = options;

  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [count, scans, status] = await Promise.all([
          getPendingOperationsCount(),
          getRecentScans(10),
          getOfflineStatus(),
        ]);
        setPendingCount(count);
        setRecentScans(scans);
        setOfflineStatus(status);
      } catch (error) {
        clientLogger.error('Failed to load mobile data', error);
      }
    };

    loadData();
  }, []);

  // Auto sync when coming online
  useEffect(() => {
    if (isOnline && autoSync && pendingCount > 0) {
      sync();
    }
  }, [isOnline, autoSync, pendingCount]);

  /**
   * Process a barcode scan
   */
  const processScan = useCallback(async (
    barcode: string,
    context: string = 'general'
  ): Promise<ScanResponse> => {
    try {
      // Parse locally first
      const localResult = parseBarcode(barcode);

      // Try to resolve via API
      if (isOnline) {
        const response = await fetch('/api/mobile/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode, context }),
        });

        if (response.ok) {
          const result = await response.json();
          
          // Feedback
          if (result.resolved) {
            if (enableHaptics) triggerHaptic('success');
            if (enableAudio) playAudioFeedback('success');
          } else {
            if (enableHaptics) triggerHaptic('warning');
          }

          // Log scan
          await logScan(
            barcode,
            result.scan.type,
            context,
            result.resolved ? 'success' : 'not_found',
            result.entity?.id as string
          );

          // Update recent scans
          const scans = await getRecentScans(10);
          setRecentScans(scans);

          return result;
        }
      }

      // Offline mode - try local cache
      const cachedPart = await getCachedPartByNumber(localResult.value);
      
      if (enableHaptics) {
        triggerHaptic(cachedPart ? 'success' : 'warning');
      }

      await logScan(
        barcode,
        localResult.type,
        context,
        cachedPart ? 'success' : 'not_found',
        cachedPart?.id
      );

      const scans = await getRecentScans(10);
      setRecentScans(scans);

      return {
        success: true,
        scan: {
          raw: barcode,
          type: localResult.type,
          value: localResult.value,
          format: localResult.format,
          confidence: localResult.confidence,
        },
        resolved: !!cachedPart,
        entity: (cachedPart as unknown as Record<string, unknown>) || null,
        actions: getAvailableActions(localResult.type, context),
      };
    } catch (error) {
      if (enableHaptics) triggerHaptic('error');
      if (enableAudio) playAudioFeedback('error');
      
      return {
        success: false,
        scan: {
          raw: barcode,
          type: 'UNKNOWN',
          value: barcode,
          format: 'UNKNOWN',
          confidence: 0,
        },
        resolved: false,
        entity: null,
        actions: [],
        error: error instanceof Error ? error.message : 'Scan failed',
      };
    }
  }, [isOnline, enableHaptics, enableAudio]);

  /**
   * Search parts (local or remote)
   */
  const searchParts = useCallback(async (query: string): Promise<CachedPart[]> => {
    if (isOnline) {
      try {
        const response = await fetch(`/api/mobile/inventory?search=${encodeURIComponent(query)}`);
        if (response.ok) {
          const result = await response.json();
          return result.data || [];
        }
      } catch {
        // Fall through to local search
      }
    }

    // Local search
    return searchCachedParts(query);
  }, [isOnline]);

  /**
   * Submit an operation (queued if offline)
   */
  const submitOperation = useCallback(async (
    type: OperationType,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; id: string; queued: boolean }> => {
    if (isOnline) {
      try {
        // Determine the endpoint based on type
        const endpoints: Record<OperationType, string> = {
          inventory_adjust: '/api/mobile/inventory',
          inventory_transfer: '/api/mobile/inventory',
          inventory_count: '/api/mobile/inventory',
          po_receive: '/api/mobile/receiving',
          so_pick: '/api/mobile/picking',
          wo_start: '/api/mobile/workorder',
          wo_complete: '/api/mobile/workorder',
          quality_inspect: '/api/mobile/quality',
        };

        const response = await fetch(endpoints[type], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: type.split('_')[1] || type, ...data }),
        });

        if (response.ok) {
          const result = await response.json();
          if (enableHaptics) triggerHaptic('success');
          return { success: true, id: result.transactionId || result.id, queued: false };
        }
      } catch {
        // Fall through to queue
      }
    }

    // Queue for later sync
    const id = await queueOperation(type, data);
    const count = await getPendingOperationsCount();
    setPendingCount(count);
    
    if (enableHaptics) triggerHaptic('confirm');
    
    return { success: true, id, queued: true };
  }, [isOnline, enableHaptics]);

  /**
   * Sync pending operations
   */
  const sync = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!isOnline) {
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);

    try {
      const result = await syncPendingOperations();
      const count = await getPendingOperationsCount();
      setPendingCount(count);

      if (result.success > 0 && enableHaptics) {
        triggerHaptic('success');
      }

      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, enableHaptics]);

  /**
   * Download master data for offline use
   */
  const downloadData = useCallback(async (): Promise<{ parts: number; locations: number }> => {
    if (!isOnline) {
      throw new Error('Cannot download while offline');
    }

    const result = await downloadMasterData();
    const status = await getOfflineStatus();
    setOfflineStatus(status);

    if (enableHaptics) triggerHaptic('success');

    return result;
  }, [isOnline, enableHaptics]);

  /**
   * Refresh offline status
   */
  const refreshStatus = useCallback(async () => {
    const status = await getOfflineStatus();
    setOfflineStatus(status);
    setPendingCount(status.pendingOperations);
  }, []);

  return {
    // State
    isOnline,
    pendingCount,
    isSyncing,
    recentScans,
    offlineStatus,

    // Actions
    processScan,
    searchParts,
    submitOperation,
    sync,
    downloadData,
    refreshStatus,

    // Utilities
    triggerHaptic: enableHaptics ? triggerHaptic : () => {},
    playAudio: enableAudio ? playAudioFeedback : () => {},
  };
}

export default useMobile;
