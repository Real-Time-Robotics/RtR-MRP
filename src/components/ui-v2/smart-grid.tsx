'use client';

import React from 'react';
import { DataTable, DataTableProps } from './data-table';
import { create } from 'zustand';

// Store for managing grid state (selection, edits, etc.)
// Context Item Type Definition
export type ContextEntityType = 'part' | 'supplier' | 'customer' | 'order' | 'production' | 'unknown';

export interface ContextItem {
    id: string;
    type?: ContextEntityType;
    [key: string]: unknown;
}

// Store for managing grid state (selection, edits, etc.)
interface SmartGridStore {
    selectedId: string | null;
    selectedItem: ContextItem | null;
    setSelectedId: (id: string | null, item?: ContextItem) => void;

    // Excel-like Navigation
    focusedCell: { rowId: string; colId: string } | null;
    setFocusedCell: (cell: { rowId: string; colId: string } | null) => void;
    editingCell: { rowId: string; colId: string } | null;
    setEditingCell: (cell: { rowId: string; colId: string } | null) => void;

    isInspectorOpen: boolean;
    toggleInspector: () => void;
}

export const useSmartGridStore = create<SmartGridStore>((set) => ({
    selectedId: null,
    selectedItem: null,
    setSelectedId: (id, item) => set({ selectedId: id, selectedItem: item || null, isInspectorOpen: !!id }),

    focusedCell: null,
    setFocusedCell: (cell) => set({ focusedCell: cell }),
    editingCell: null,
    setEditingCell: (cell) => set({ editingCell: cell }),

    isInspectorOpen: false,
    toggleInspector: () => set((state) => ({ isInspectorOpen: !state.isInspectorOpen })),
}));

type SmartGridProps<T> = DataTableProps<T>;

import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';

// ... 

export function SmartGrid<T extends Record<string, any>>({
    onRowClick,
    data,     // Need to destructure data and columns to pass to hook
    columns,
    ...props
}: SmartGridProps<T>) {
    const { selectedId, setSelectedId } = useSmartGridStore();

    // Enable Keyboard Navigation
    useKeyboardNavigation({ data, columns });

    const handleRowClick = (row: T, index: number) => {
        // Determine ID
        const id = row.id || row.partId || row.key; // Fallback
        if (id) {
            setSelectedId(
                id === selectedId ? null : id,
                id === selectedId ? undefined : (row as unknown as ContextItem)
            );
        }

        // Call original handler
        if (onRowClick) {
            onRowClick(row, index);
        }
    };

    return (
        <div className="h-full flex flex-col min-w-0">
            <DataTable
                {...props}
                data={data}
                columns={columns}
                onRowClick={handleRowClick}
                selectedKeys={selectedId ? new Set([selectedId]) : undefined}
                className="border-none rounded-none h-full"
                // Force sticky header and full height
                maxHeight="calc(100vh - 200px)" // Adjust based on layout
            />
        </div>
    );
}
