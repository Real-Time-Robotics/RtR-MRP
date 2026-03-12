'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  CostingBreakdown,
  CostingSummary,
  DEFAULT_COSTING_PARAMS,
} from '../types';
import { calculateCosting, calculateCostingSummary } from '../utils/costing-calculator';

// Demo data generator for MRP parts
const generateDemoCostings = (): CostingBreakdown[] => {
  const parts = [
    { id: 'FG-001', unitCost: 150, srp: 8790000, category: 'FINISHED_GOODS' },
    { id: 'FG-002', unitCost: 120, srp: 6590000, category: 'FINISHED_GOODS' },
    { id: 'COMP-001', unitCost: 45, srp: 1200000, category: 'COMPONENTS' },
    { id: 'COMP-002', unitCost: 35, srp: 950000, category: 'COMPONENTS' },
    { id: 'RAW-001', unitCost: 12, srp: 450000, category: 'RAW_MATERIALS' },
    { id: 'RAW-002', unitCost: 8, srp: 320000, category: 'RAW_MATERIALS' },
    { id: 'PKG-001', unitCost: 2.5, srp: 85000, category: 'PACKAGING' },
    { id: 'PKG-002', unitCost: 1.8, srp: 65000, category: 'PACKAGING' },
  ];

  return parts.map((part) =>
    calculateCosting({
      skuId: part.id,
      partId: part.id,
      unitCost: part.unitCost,
      category: part.category,
      srp: part.srp,
      exchangeRate: DEFAULT_COSTING_PARAMS.exchangeRate,
    })
  );
};

interface UseCostingOptions {
  partType?: 'FINISHED_GOODS' | 'COMPONENTS' | 'RAW_MATERIALS' | 'PACKAGING';
  supplierId?: string;
  useDemoData?: boolean;
}

interface UseCostingReturn {
  costings: CostingBreakdown[];
  summary: CostingSummary;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  selectedPart: CostingBreakdown | null;
  selectPart: (costing: CostingBreakdown | null) => void;
  updateCosting: (id: string, updates: Partial<{ unitCost: number; srp: number; exchangeRate: number }>) => Promise<boolean>;
  batchUpdate: (updates: { skuId: string; unitCost?: number; srp?: number }[]) => Promise<boolean>;
  recalculateAll: (exchangeRate: number) => void;
  refresh: () => Promise<void>;
  exportToCSV: () => void;
}

export function useCosting(options: UseCostingOptions = {}): UseCostingReturn {
  const { partType, supplierId, useDemoData = true } = options;

  const [costings, setCostings] = useState<CostingBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<CostingBreakdown | null>(null);

  // Fetch data on mount and when filters change
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (useDemoData) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          let demoData = generateDemoCostings();

          // Filter by part type if specified
          if (partType) {
            demoData = demoData.filter((c) =>
              c.partId?.includes(partType.substring(0, 3).toUpperCase())
            );
          }

          setCostings(demoData);
          setSelectedPart(demoData[0] || null);
        } else {
          // Fetch real costing data from MRP Finance API
          const params = new URLSearchParams();
          if (partType) params.set('category', partType);
          if (supplierId) params.set('supplierId', supplierId);

          const response = await fetch(`/api/finance/costing?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();
          const items = Array.isArray(data) ? data : data.data || data.rows || [];

          if (items.length > 0) {
            // Map API response to CostingBreakdown format
            const mapped = items.map((item: Record<string, unknown>) =>
              calculateCosting({
                skuId: (item.partNumber as string) || (item.partId as string) || '',
                partId: (item.partId as string) || '',
                unitCost: (item.unitCost as number) || (item.materialCost as number) || 0,
                category: (item.category as string) || 'DEFAULT',
                srp: (item.srp as number) || (item.sellingPrice as number) || 0,
                exchangeRate: (item.exchangeRate as number) || DEFAULT_COSTING_PARAMS.exchangeRate,
              })
            );
            setCostings(mapped);
            setSelectedPart(mapped[0] || null);
          } else {
            // No data from API - fall back to demo data
            const demoData = generateDemoCostings();
            setCostings(demoData);
            setSelectedPart(demoData[0] || null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch costing data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        // Graceful fallback to demo data on error
        const demoData = generateDemoCostings();
        setCostings(demoData);
        setSelectedPart(demoData[0] || null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [partType, supplierId, useDemoData]);

  const summary = useMemo(() => calculateCostingSummary(costings), [costings]);

  const selectPart = useCallback((costing: CostingBreakdown | null) => {
    setSelectedPart(costing);
  }, []);

  const updateCosting = useCallback(async (
    id: string,
    updates: Partial<{ unitCost: number; srp: number; exchangeRate: number }>
  ): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      const existingCosting = costings.find((c) => c.id === id);
      if (!existingCosting) {
        throw new Error('Costing not found');
      }

      // Calculate new values locally (optimistic update)
      const newCosting = calculateCosting({
        skuId: existingCosting.skuId,
        partId: existingCosting.partId,
        unitCost: updates.unitCost ?? existingCosting.unitCost,
        category: 'DEFAULT',
        srp: updates.srp ?? existingCosting.srp,
        exchangeRate: updates.exchangeRate ?? existingCosting.exchangeRate,
      });
      newCosting.id = id;

      // Optimistic update
      setCostings((prev) =>
        prev.map((c) => (c.id === id ? newCosting : c))
      );

      if (selectedPart?.id === id) {
        setSelectedPart(newCosting);
      }

      // Persist to API if not in demo mode
      if (!useDemoData) {
        try {
          await fetch(`/api/finance/costing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partId: id, ...updates, action: 'update' }),
          });
        } catch (apiErr) {
          console.warn('Failed to persist costing update to API, local state updated:', apiErr);
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to update costing:', err);
      setError(err instanceof Error ? err.message : 'Failed to update');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [costings, selectedPart]);

  const batchUpdate = useCallback(async (
    updates: { skuId: string; unitCost?: number; srp?: number }[]
  ): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      setCostings((prev) =>
        prev.map((c) => {
          const update = updates.find((u) => u.skuId === c.skuId);
          if (!update) return c;

          return calculateCosting({
            skuId: c.skuId,
            partId: c.partId,
            unitCost: update.unitCost ?? c.unitCost,
            category: 'DEFAULT',
            srp: update.srp ?? c.srp,
            exchangeRate: c.exchangeRate,
          });
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 300));
      return true;
    } catch (err) {
      console.error('Failed to batch update costings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const recalculateAll = useCallback((exchangeRate: number) => {
    setCostings((prev) =>
      prev.map((c) =>
        calculateCosting({
          skuId: c.skuId,
          partId: c.partId,
          unitCost: c.unitCost,
          category: 'DEFAULT',
          srp: c.srp,
          exchangeRate,
        })
      )
    );
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const demoData = generateDemoCostings();
      setCostings(demoData);
      setSelectedPart(demoData[0] || null);
    } catch (err) {
      console.error('Failed to refresh costing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportToCSV = useCallback(() => {
    const rows = ['Part ID,Unit Cost,Currency,Exchange Rate,Landed Cost VND,SRP,Margin'];
    costings.forEach((c) => {
      rows.push(`${c.partId || c.skuId},${c.unitCost},${c.unitCostCurrency},${c.exchangeRate},${c.landedCostVND},${c.srp},${(c.grossMargin * 100).toFixed(1)}%`);
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `costing-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }, [costings]);

  return {
    costings,
    summary,
    isLoading,
    isSaving,
    error,
    selectedPart,
    selectPart,
    updateCosting,
    batchUpdate,
    recalculateAll,
    refresh,
    exportToCSV,
  };
}

export default useCosting;
