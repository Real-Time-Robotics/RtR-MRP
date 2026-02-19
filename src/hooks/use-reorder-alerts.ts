'use client';

import { useState, useEffect, useCallback } from 'react';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ReorderAlertItem {
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  minStockLevel: number;
  safetyStock: number;
  status: 'CRITICAL' | 'LOW' | 'WARNING';
  daysOfStock: number;
  avgDailyUsage: number;
  preferredSupplier?: {
    id: string;
    name: string;
    leadTimeDays: number;
  };
  suggestedOrderQty: number;
  estimatedCost: number;
}

export interface ReorderSuggestion {
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  supplier: {
    id: string;
    name: string;
    leadTimeDays: number;
  } | null;
  unitCost: number;
  totalCost: number;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface ReorderAlertSummary {
  critical: number;
  low: number;
  warning: number;
  totalValue: number;
  items: ReorderAlertItem[];
  suggestions: ReorderSuggestion[];
  lastChecked: string;
}

// =============================================================================
// HOOK
// =============================================================================

interface UseReorderAlertsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useReorderAlerts(options: UseReorderAlertsOptions = {}) {
  const { autoRefresh = true, refreshInterval = 60000 } = options;

  const [summary, setSummary] = useState<ReorderAlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/alerts/reorder?view=summary');
      const data = await res.json();

      if (data.success) {
        setSummary(data.data);
      } else {
        setError(data.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger check
  const triggerCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchSummary();
      } else {
        setError(data.error || 'Check failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchSummary]);

  // Create purchase requisition
  const createPR = useCallback(async (partIds: string[]) => {
    try {
      const res = await fetch('/api/alerts/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_pr', partIds }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchSummary();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create PR');
      }
    } catch (err) {
      throw err;
    }
  }, [fetchSummary]);

  // Dismiss alerts
  const dismissAlerts = useCallback(async (partIds: string[]) => {
    try {
      const res = await fetch('/api/alerts/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', partIds }),
      });
      const data = await res.json();

      if (data.success) {
        await fetchSummary();
      }
    } catch (err) {
      clientLogger.error('Failed to dismiss alerts', err);
    }
  }, [fetchSummary]);

  // Initial fetch
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchSummary, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSummary]);

  // Computed values
  const totalAlerts = summary ? summary.critical + summary.low + summary.warning : 0;
  const hasCritical = (summary?.critical || 0) > 0;
  const urgentSuggestions = summary?.suggestions.filter((s) => s.priority === 'URGENT') || [];

  return {
    summary,
    loading,
    error,
    totalAlerts,
    hasCritical,
    urgentSuggestions,
    refresh: fetchSummary,
    triggerCheck,
    createPR,
    dismissAlerts,
  };
}

export default useReorderAlerts;
