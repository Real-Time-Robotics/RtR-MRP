'use client';

/**
 * useChangeImpact Hook
 * React hook for managing change impact analysis workflow
 */

import { useState, useCallback } from 'react';
import {
  ChangeImpactResult,
  FieldChange,
  ImpactableEntity,
} from '@/lib/change-impact/types';
import { UseChangeImpactOptions, UseChangeImpactReturn } from '../types';

export function useChangeImpact(
  options: UseChangeImpactOptions = {}
): UseChangeImpactReturn {
  const { onSuccess, onError } = options;

  const [result, setResult] = useState<ChangeImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<(() => void) | null>(null);

  const checkImpact = useCallback(
    async (
      entity: string,
      entityId: string,
      changes: FieldChange[]
    ): Promise<ChangeImpactResult | null> => {
      // Skip if no changes
      if (!changes.length) {
        return null;
      }

      setLoading(true);
      setError(null);
      setShowDialog(true);

      try {
        const response = await fetch('/api/change-impact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: entity as ImpactableEntity,
            entityId,
            changes,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to calculate impact');
        }

        setResult(data.data);
        return data.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to calculate impact';
        setError(errorMessage);
        onError?.(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [onError]
  );

  const confirm = useCallback(() => {
    setShowDialog(false);
    pendingConfirm?.();
    onSuccess?.();
    reset();
  }, [pendingConfirm, onSuccess]);

  const cancel = useCallback(() => {
    setShowDialog(false);
    reset();
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setPendingConfirm(null);
  }, []);

  return {
    checkImpact,
    result,
    loading,
    error,
    showDialog,
    setShowDialog,
    confirm,
    cancel,
    reset,
  };
}

/**
 * Helper function to detect changes between old and new values
 */
export function detectChanges(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  fieldConfig: Record<string, { label: string; valueType: FieldChange['valueType'] }>
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const [field, config] of Object.entries(fieldConfig)) {
    const oldValue = oldValues[field];
    const newValue = newValues[field];

    // Skip if values are the same
    if (oldValue === newValue) continue;

    // Skip if both are null/undefined
    if (
      (oldValue === null || oldValue === undefined) &&
      (newValue === null || newValue === undefined)
    ) {
      continue;
    }

    // For numbers, check if they're effectively equal
    if (config.valueType === 'number' || config.valueType === 'currency') {
      if (Number(oldValue) === Number(newValue)) continue;
    }

    changes.push({
      field,
      fieldLabel: config.label,
      oldValue,
      newValue,
      valueType: config.valueType,
    });
  }

  return changes;
}

/**
 * Part form field configuration for change detection
 */
export const PART_FORM_FIELD_CONFIG: Record<
  string,
  { label: string; valueType: FieldChange['valueType'] }
> = {
  unitCost: { label: 'Unit Cost', valueType: 'currency' },
  leadTime: { label: 'Lead Time', valueType: 'number' },
  minOrderQty: { label: 'Min Order Qty', valueType: 'number' },
  safetyStock: { label: 'Safety Stock', valueType: 'number' },
  reorderPoint: { label: 'Reorder Point', valueType: 'number' },
  maxStock: { label: 'Max Stock', valueType: 'number' },
};

/**
 * BOM form field configuration for change detection
 */
export const BOM_FORM_FIELD_CONFIG: Record<
  string,
  { label: string; valueType: FieldChange['valueType'] }
> = {
  version: { label: 'Version', valueType: 'string' },
  status: { label: 'Status', valueType: 'string' },
  effectiveDate: { label: 'Effective Date', valueType: 'date' },
};
