'use client';

import { useRef, useEffect } from 'react';
import { AtSign, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface MentionUser {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

interface MentionAutocompleteProps {
  isActive: boolean;
  users: MentionUser[];
  selectedIndex: number;
  isLoading: boolean;
  position: { top: number; left: number };
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
}

export function MentionAutocomplete({
  isActive,
  users,
  selectedIndex,
  isLoading,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isActive) return null;

  const getUserInitials = (name: string | null, email: string): string => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  return (
    <>
      {/* Backdrop to close on outside click */}
      <div className="fixed inset-0 z-40" role="presentation" onClick={onClose} />

      {/* Dropdown */}
      <div
        className="absolute z-50 w-[280px] bg-card border rounded-lg shadow-lg overflow-hidden"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b flex items-center gap-2 bg-muted/30">
          <AtSign className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Mention a user
          </span>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="px-3 py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Searching...</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && users.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No users found
          </div>
        )}

        {/* User list */}
        {!isLoading && users.length > 0 && (
          <ScrollArea className="max-h-[200px]">
            <div ref={listRef}>
              {users.map((user, index) => (
                <button
                  key={user.id}
                  data-index={index}
                  onClick={() => onSelect(user)}
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-3 text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-muted/50 border-l-2 border-transparent'
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.name || user.email}
                    </div>
                    {user.name && (
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    )}
                  </div>

                  {/* Role badge */}
                  {user.role && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground flex-shrink-0 capitalize">
                      {user.role}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Hint */}
        <div className="px-3 py-1.5 border-t bg-muted/30 text-[10px] text-muted-foreground">
          ↑↓ navigate • Enter select • Esc close
        </div>
      </div>
    </>
  );
}
