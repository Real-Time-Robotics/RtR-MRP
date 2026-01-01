// src/components/ui/virtualized-list.tsx
// High-performance virtualized list for large datasets

"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface VirtualizedListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number | ((index: number) => number);
  maxHeight?: number | string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  gap?: number;
  overscan?: number;
}

// ============================================
// VIRTUALIZED LIST COMPONENT
// ============================================

export function VirtualizedList<T>({
  data,
  renderItem,
  itemHeight = 64,
  maxHeight = 600,
  loading = false,
  emptyMessage = "No items",
  className = "",
  gap = 0,
  overscan = 5,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // List virtualizer
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize:
      typeof itemHeight === "function" ? itemHeight : () => itemHeight,
    overscan,
    gap,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{
        maxHeight:
          typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(data[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// INFINITE SCROLL VIRTUALIZED LIST
// ============================================

export interface InfiniteVirtualizedListProps<T> extends VirtualizedListProps<T> {
  hasMore: boolean;
  loadMore: () => void;
  loadingMore?: boolean;
  threshold?: number;
}

export function InfiniteVirtualizedList<T>({
  data,
  renderItem,
  itemHeight = 64,
  maxHeight = 600,
  loading = false,
  emptyMessage = "No items",
  className = "",
  gap = 0,
  overscan = 5,
  hasMore,
  loadMore,
  loadingMore = false,
  threshold = 5,
}: InfiniteVirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // List virtualizer with infinite scroll
  const virtualizer = useVirtualizer({
    count: hasMore ? data.length + 1 : data.length,
    getScrollElement: () => parentRef.current,
    estimateSize:
      typeof itemHeight === "function" ? itemHeight : () => itemHeight,
    overscan,
    gap,
  });

  // Check if we need to load more
  React.useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) return;

    if (
      lastItem.index >= data.length - threshold &&
      hasMore &&
      !loadingMore
    ) {
      loadMore();
    }
  }, [virtualizer.getVirtualItems(), data.length, hasMore, loadingMore, loadMore, threshold]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{
        maxHeight:
          typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const isLoaderRow = virtualItem.index > data.length - 1;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {isLoaderRow ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderItem(data[virtualItem.index], virtualItem.index)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualizedList;
