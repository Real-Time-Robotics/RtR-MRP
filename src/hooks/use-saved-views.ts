// src/hooks/use-saved-views.ts
// Hook for managing saved views in list pages

import { useState, useEffect, useCallback } from 'react';

export interface SavedView {
  id: string;
  name: string;
  entityType: string;
  filters: Record<string, unknown>;
  sort: { column: string; direction: 'asc' | 'desc' } | null;
  columns: { visible: string[]; order?: string[]; widths?: Record<string, number> } | null;
  isDefault: boolean;
  isShared: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface UseSavedViewsOptions {
  entityType: string;
  onApplyView?: (view: SavedView) => void;
}

interface UseSavedViewsReturn {
  views: SavedView[];
  currentView: SavedView | null;
  loading: boolean;
  error: string | null;
  applyView: (view: SavedView) => void;
  saveCurrentView: (name: string, config: Partial<SavedView>) => Promise<SavedView | null>;
  updateView: (id: string, config: Partial<SavedView>) => Promise<SavedView | null>;
  deleteView: (id: string) => Promise<boolean>;
  setAsDefault: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSavedViews({
  entityType,
  onApplyView,
}: UseSavedViewsOptions): UseSavedViewsReturn {
  const [views, setViews] = useState<SavedView[]>([]);
  const [currentView, setCurrentView] = useState<SavedView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch views
  const fetchViews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/saved-views?entityType=${entityType}`);
      const data = await res.json();
      if (data.success) {
        setViews(data.data);
        // Auto-apply default view if none selected
        if (!currentView) {
          const defaultView = data.data.find((v: SavedView) => v.isDefault);
          if (defaultView) {
            setCurrentView(defaultView);
            onApplyView?.(defaultView);
          }
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Không thể tải saved views');
    } finally {
      setLoading(false);
    }
  }, [entityType, currentView, onApplyView]);

  useEffect(() => {
    fetchViews();
  }, [entityType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply a view
  const applyView = useCallback((view: SavedView) => {
    setCurrentView(view);
    onApplyView?.(view);
  }, [onApplyView]);

  // Save current view
  const saveCurrentView = useCallback(async (
    name: string,
    config: Partial<SavedView>
  ): Promise<SavedView | null> => {
    try {
      const res = await fetch('/api/saved-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          entityType,
          ...config,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchViews();
        return data.data;
      }
      setError(data.error);
      return null;
    } catch (err) {
      setError('Không thể lưu view');
      return null;
    }
  }, [entityType, fetchViews]);

  // Update a view
  const updateView = useCallback(async (
    id: string,
    config: Partial<SavedView>
  ): Promise<SavedView | null> => {
    try {
      const res = await fetch(`/api/saved-views/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (data.success) {
        await fetchViews();
        return data.data;
      }
      setError(data.error);
      return null;
    } catch (err) {
      setError('Không thể cập nhật view');
      return null;
    }
  }, [fetchViews]);

  // Delete a view
  const deleteView = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/saved-views/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (currentView?.id === id) {
          setCurrentView(null);
        }
        await fetchViews();
        return true;
      }
      setError(data.error);
      return false;
    } catch (err) {
      setError('Không thể xóa view');
      return false;
    }
  }, [currentView, fetchViews]);

  // Set as default
  const setAsDefault = useCallback(async (id: string): Promise<boolean> => {
    return (await updateView(id, { isDefault: true })) !== null;
  }, [updateView]);

  return {
    views,
    currentView,
    loading,
    error,
    applyView,
    saveCurrentView,
    updateView,
    deleteView,
    setAsDefault,
    refresh: fetchViews,
  };
}
