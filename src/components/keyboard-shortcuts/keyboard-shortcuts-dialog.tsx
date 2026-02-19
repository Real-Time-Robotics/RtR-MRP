'use client';

// src/components/keyboard-shortcuts/keyboard-shortcuts-dialog.tsx
// Keyboard Shortcuts Help Dialog

import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SHORTCUT_CATEGORIES, formatShortcut } from '@/hooks/use-keyboard-shortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.includes('Mac'));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Phím tắt
          </DialogTitle>
          <DialogDescription>
            Sử dụng phím tắt để thao tác nhanh hơn.{' '}
            {isMac ? 'Nhấn ⌘ (Command)' : 'Nhấn Ctrl'} để kích hoạt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.name}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {category.name}
              </h4>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs font-mono">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>
            Nhấn <kbd className="px-1 bg-muted rounded">?</kbd> hoặc{' '}
            <kbd className="px-1 bg-muted rounded">{isMac ? '⌘' : 'Ctrl'}+/</kbd>{' '}
            để mở bảng phím tắt này.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
