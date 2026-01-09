
import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
    [key: string]: KeyHandler;
}

/**
 * Hook to handle keyboard shortcuts.
 * 
 * Usage:
 * useKeyboardShortcuts({
 *   'Control+Enter': () => submit(),
 *   'Meta+Enter': () => submit(), // Mac Command+Enter
 *   'Escape': () => close(),
 * });
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Create a key string identifier
            const keys = [];
            if (event.ctrlKey) keys.push('Control');
            if (event.metaKey) keys.push('Meta');
            if (event.altKey) keys.push('Alt');
            if (event.shiftKey) keys.push('Shift');

            // Add the main key
            // Normalize arrow keys and others if needed, but 'key' is usually good
            keys.push(event.key);

            const combo = keys.join('+');

            // Check for exact match
            const handler = shortcuts[combo] || shortcuts[event.key];

            if (handler) {
                handler(event);
            }
        },
        [shortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}
