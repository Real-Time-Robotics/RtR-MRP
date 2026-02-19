
import { useEffect } from 'react';
import { useSmartGridStore, ContextItem } from '@/components/ui-v2/smart-grid';

/**
 * Synchronizes the current page's primary entity with the AI Copilot context.
 * Use this in Detail Pages (e.g., /orders/[id], /suppliers/[id]).
 * Accepts any object with an optional `id` field.
 */
export function useAIContextSync(type: string, data: { id?: string } | null) {
    const { setSelectedId } = useSmartGridStore();

    useEffect(() => {
        if (data && data.id) {
            // We map the generic data to the store's selected item
            // The 'type' parameter can be used to tag the data if the store supports it,
            // but currently we primarily use the item shape.
            // We inject the type into the item so ContextAnalysisCard can read it.
            const contextItem = { ...data, type } as ContextItem;
            setSelectedId(data.id, contextItem);
        }

        // Cleanup: Clear context when unmounting (leaving the page)
        return () => {
            setSelectedId(null, undefined);
        };
    }, [data, type, setSelectedId]);
}
