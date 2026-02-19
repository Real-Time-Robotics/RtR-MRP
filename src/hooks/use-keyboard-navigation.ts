
import { useEffect } from 'react';
import { useSmartGridStore } from '@/components/ui-v2/smart-grid';

interface UseKeyboardNavProps {
    data: Array<{ id?: string; partId?: string; key?: string }>;
    columns: Array<{ key: string }>;
    onEnterEdit?: (rowId: string, colId: string) => void;
}

export function useKeyboardNavigation({ data, columns }: UseKeyboardNavProps) {
    const { focusedCell, setFocusedCell } = useSmartGridStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if editing an input (unless it's special keys like Enter/Tab which we might handle later, but normally Input handles them)
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (!focusedCell) return;

            // Find current indices
            const currentRowIndex = data.findIndex(item => (item.id || item.partId || item.key) === focusedCell.rowId);
            const currentColIndex = columns.findIndex(col => col.key === focusedCell.colId);

            if (currentRowIndex === -1 || currentColIndex === -1) return;

            let nextRowIndex = currentRowIndex;
            let nextColIndex = currentColIndex;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    nextRowIndex = Math.max(0, currentRowIndex - 1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    nextRowIndex = Math.min(data.length - 1, currentRowIndex + 1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    nextColIndex = Math.max(0, currentColIndex - 1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextColIndex = Math.min(columns.length - 1, currentColIndex + 1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (focusedCell) {
                        // Trigger edit mode
                        const { setEditingCell } = useSmartGridStore.getState();
                        setEditingCell(focusedCell);
                    }
                    break;
                default:
                    return;
            }

            // Update focus if changed
            const nextRow = data[nextRowIndex];
            const nextCol = columns[nextColIndex];

            if (nextRow && nextCol) {
                const nextRowId = nextRow.id || nextRow.partId || nextRow.key || '';
                setFocusedCell({ rowId: nextRowId, colId: nextCol.key });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data, columns, focusedCell, setFocusedCell]);
}
