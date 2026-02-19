// src/hooks/use-keyboard-shortcuts.ts
// Global keyboard shortcuts system

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

// Extended shortcut interface with metadata
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  global?: boolean;  // Works even in inputs
}

// Default global shortcuts definitions
export const SHORTCUT_CATEGORIES = [
  {
    name: 'Điều hướng',
    shortcuts: [
      { key: 'g', meta: true, description: 'Về Dashboard' },
      { key: 'p', meta: true, shift: true, description: 'Danh sách Parts' },
      { key: 'o', meta: true, shift: true, description: 'Đơn hàng' },
      { key: 's', meta: true, shift: true, description: 'Nhà cung cấp' },
      { key: 'w', meta: true, shift: true, description: 'Work Orders' },
      { key: 'i', meta: true, shift: true, description: 'Import dữ liệu' },
    ],
  },
  {
    name: 'Thao tác chung',
    shortcuts: [
      { key: 'k', meta: true, description: 'Mở Command Palette' },
      { key: 'n', meta: true, shift: true, description: 'Tạo mới' },
      { key: '/', description: 'Focus vào tìm kiếm' },
      { key: 'Escape', description: 'Đóng modal / Hủy', global: true },
      { key: '?', description: 'Mở bảng phím tắt' },
    ],
  },
  {
    name: 'Bảng dữ liệu',
    shortcuts: [
      { key: 'a', meta: true, description: 'Chọn tất cả' },
      { key: 'r', meta: true, shift: true, description: 'Làm mới dữ liệu' },
      { key: 'e', meta: true, shift: true, description: 'Xuất Excel' },
      { key: 'Delete', description: 'Xóa mục đã chọn' },
    ],
  },
  {
    name: 'Form / Editor',
    shortcuts: [
      { key: 's', meta: true, description: 'Lưu' },
      { key: 'Enter', meta: true, description: 'Submit form' },
    ],
  },
];

interface UseGlobalShortcutsOptions {
  shortcuts?: KeyboardShortcut[];
  enabled?: boolean;
}

// Hook for page-level shortcuts with navigation
export function useGlobalShortcuts(options: UseGlobalShortcutsOptions = {}) {
  const { shortcuts = [], enabled = true } = options;
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const target = event.target as HTMLElement;
    const isInputFocused =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable;

    for (const shortcut of shortcutsRef.current) {
      // Skip non-global shortcuts when input is focused
      if (isInputFocused && !shortcut.global && shortcut.key !== 'Escape') {
        continue;
      }

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey;
      const metaMatch = shortcut.meta ? (event.metaKey || event.ctrlKey) : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts: shortcutsRef.current };
}

// Helper hook for common navigation shortcuts
export function useNavigationShortcuts(callbacks?: {
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
}) {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    { key: 'g', meta: true, description: 'Go to Dashboard', action: () => router.push('/') },
    { key: 'p', meta: true, shift: true, description: 'Go to Parts', action: () => router.push('/parts') },
    { key: 'o', meta: true, shift: true, description: 'Go to Orders', action: () => router.push('/orders') },
    { key: 's', meta: true, shift: true, description: 'Go to Suppliers', action: () => router.push('/suppliers') },
    { key: 'w', meta: true, shift: true, description: 'Go to Work Orders', action: () => router.push('/work-orders') },
    { key: 'i', meta: true, shift: true, description: 'Go to Import', action: () => router.push('/import') },
  ];

  if (callbacks?.onOpenCommandPalette) {
    shortcuts.push({
      key: 'k',
      meta: true,
      description: 'Open Command Palette',
      action: callbacks.onOpenCommandPalette,
    });
  }

  if (callbacks?.onOpenShortcutsHelp) {
    shortcuts.push({
      key: '?',
      description: 'Open Shortcuts Help',
      action: callbacks.onOpenShortcutsHelp,
    });
  }

  useGlobalShortcuts({ shortcuts });
}

// Format shortcut for display
export function formatShortcut(shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }): string {
  const parts: string[] = [];
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  if (shortcut.meta || shortcut.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format special keys
  let key = shortcut.key;
  if (key === 'Escape') key = 'Esc';
  if (key === ' ') key = 'Space';
  if (key === 'Delete') key = isMac ? '⌫' : 'Del';

  parts.push(key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}
