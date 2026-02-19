'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { clientLogger } from '@/lib/client-logger';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditableCellProps {
    value: string | number;
    rowId: string;
    columnId: string;
    type?: 'text' | 'number';
    onSave: (value: string | number) => Promise<void>;
    className?: string;
    format?: (value: string | number) => string;
}

import { useSmartGridStore } from './smart-grid';

// ... imports

export function EditableCell({
    value: initialValue,
    rowId,
    columnId,
    type = 'text',
    onSave,
    className,
    format,
}: EditableCellProps) {
    const { focusedCell, setFocusedCell, editingCell, setEditingCell } = useSmartGridStore();
    const isFocused = focusedCell?.rowId === rowId && focusedCell?.colId === columnId;

    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync with global editing state
    useEffect(() => {
        const shouldBeEditing = editingCell?.rowId === rowId && editingCell?.colId === columnId;
        if (shouldBeEditing && !isEditing) {
            setIsEditing(true);
        } else if (!shouldBeEditing && isEditing) {
            // If global state says stop, we stop? Or we own the stop?
            // Usually global initiates, local finishes.
        }
    }, [editingCell, rowId, columnId, isEditing]);

    // Sync with prop changes if not editing
    useEffect(() => {
        if (!isEditing) {
            setValue(initialValue);
        }
    }, [initialValue, isEditing]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Auto-enter edit mode if Focused + Enter key (Handled globally? Or here?)
    // Better to handle click -> Focus. Double click -> Edit.
    // Enter key logic belongs in the Grid listener to avoid 100 listeners.

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditingCell({ rowId, colId: columnId });
    };

    const handleFocus = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFocusedCell({ rowId, colId: columnId });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditingCell(null); // Clear global
        setValue(initialValue);
        // Return focus to cell
        setFocusedCell({ rowId, colId: columnId });
    };

    const handleSave = async () => {
        // Don't save if value hasn't changed
        if (value === initialValue) {
            setIsEditing(false);
            setEditingCell(null);
            setFocusedCell({ rowId, colId: columnId }); // Keep focus
            return;
        }

        // Validate number
        if (type === 'number' && isNaN(Number(value))) {
            toast.error('Vui lòng nhập số hợp lệ');
            return;
        }

        try {
            setIsLoading(true);
            const valueToSave = type === 'number' ? Number(value) : value;
            await onSave(valueToSave);
            setIsEditing(false);
            setEditingCell(null);
            setFocusedCell({ rowId, colId: columnId }); // Keep focus
            // Value update will come from props via parent refresh or optimistic update matches
        } catch (error) {
            clientLogger.error('Failed to save cell', error);
            toast.error('Không thể lưu thay đổi');
            setValue(initialValue); // Revert on error
            setEditingCell(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="relative flex items-center">
                <Input
                    ref={inputRef}
                    type={type === 'number' ? 'text' : 'text'} // number type has annoying spinners
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    disabled={isLoading}
                    className={cn(
                        "h-8 w-full min-w-[80px] px-2 py-1 text-right font-mono text-sm bg-white dark:bg-slate-950 focus-visible:ring-1 focus-visible:ring-primary shadow-sm",
                        isLoading && "opacity-50",
                        className
                    )}
                />
                {isLoading && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            onClick={handleFocus}
            onDoubleClick={handleStartEdit}
            className={cn(
                "cursor-default px-2 py-1.5 rounded transition-colors border font-mono text-right text-sm truncate min-h-[32px] flex items-center justify-end group text-foreground",
                // Base styles
                "hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700",
                // Focus styles (Excel-like selection border)
                isFocused && "bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500 z-10",
                className
            )}
            title="Double-click to edit"
        >
            <span className="truncate">
                {format ? format(value) : value}
                {!isFocused && <span className="ml-[1ch] opacity-0 group-hover:opacity-20 text-xs">✎</span>}
            </span>
        </div>
    );
}
