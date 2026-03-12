'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Search, ArrowRight, Pin, Zap, FolderOpen, Bot,
  Clock, Pause,
} from 'lucide-react';
import { useWorkSessions } from '@/hooks/use-work-sessions';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import {
  createNavigationCommands,
  createActionCommands,
  createAICommand,
  type Command,
} from '@/lib/commands/command-registry';
import { cn } from '@/lib/utils';

type LucideIcon = React.ComponentType<{ className?: string }>;

const GROUP_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  recent: { icon: Pin, label: 'Gan day' },
  actions: { icon: Zap, label: 'Lenh nhanh' },
  navigation: { icon: FolderOpen, label: 'Dieu huong' },
  ai: { icon: Bot, label: 'AI' },
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { activeSessions, pausedSessions } = useWorkSessions();

  // Open with Cmd+K / Ctrl+K
  useKeyboardShortcuts({
    'Meta+k': (e) => {
      e.preventDefault();
      setIsOpen(true);
      setQuery('');
      setSelectedIndex(0);
    },
    'Control+k': (e) => {
      e.preventDefault();
      setIsOpen(true);
      setQuery('');
      setSelectedIndex(0);
    },
  });

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Build commands
  const commands = useMemo(() => {
    const nav = createNavigationCommands(router);
    const actions = createActionCommands(router);
    const ai = createAICommand(() => {
      setIsOpen(false);
      // Trigger Cmd+J by dispatching keyboard event
      setTimeout(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'j',
            metaKey: true,
            bubbles: true,
          })
        );
      }, 100);
    });
    return [...nav, ...actions, ai];
  }, [router]);

  // Build recent items from work sessions
  const recentCommands: Command[] = useMemo(() => {
    const allSessions = [...activeSessions, ...pausedSessions].slice(0, 5);
    return allSessions.map((session) => ({
      id: `recent-${session.id}`,
      name: session.entityNumber,
      description: session.status === 'ACTIVE' ? 'dang lam viec' : 'tam dung',
      icon: session.status === 'ACTIVE' ? Clock : Pause,
      group: 'recent' as const,
      action: () => {
        router.push(session.resumeUrl);
        setIsOpen(false);
      },
    }));
  }, [activeSessions, pausedSessions, router]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    const allCommands = [...recentCommands, ...commands];

    if (!query.trim()) {
      return allCommands;
    }

    const lowerQuery = query.toLowerCase();

    return allCommands.filter((cmd) => {
      const searchText = [
        cmd.name,
        cmd.description,
        ...(cmd.keywords || []),
      ]
        .join(' ')
        .toLowerCase();
      return searchText.includes(lowerQuery);
    });
  }, [query, commands, recentCommands]);

  // Group commands
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      recent: [],
      actions: [],
      navigation: [],
      ai: [],
    };

    for (const cmd of filteredCommands) {
      groups[cmd.group]?.push(cmd);
    }

    return groups;
  }, [filteredCommands]);

  // Execute selected command
  const executeCommand = useCallback(
    (cmd: Command) => {
      cmd.action();
      setIsOpen(false);
    },
    []
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          executeCommand(cmd);
        }
      }
    },
    [filteredCommands, selectedIndex, executeCommand]
  );

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  let flatIndex = 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tim kiem hoac chay lenh..."
            className="border-0 focus-visible:ring-0 px-0 shadow-none"
          />
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Khong tim thay ket qua
            </div>
          ) : (
            Object.entries(groupedCommands).map(([group, cmds]) => {
              if (cmds.length === 0) return null;

              const groupInfo = GROUP_CONFIG[group];
              if (!groupInfo) return null;
              const GroupIcon = groupInfo.icon;

              return (
                <div key={group} className="mb-2">
                  <div className="px-2 py-1 text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <GroupIcon className="w-3 h-3" />
                    {groupInfo.label}
                  </div>
                  {cmds.map((cmd) => {
                    const currentIndex = flatIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    const Icon = cmd.icon;

                    return (
                      <div
                        key={cmd.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded cursor-pointer',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                      >
                        {Icon && (
                          <div
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center',
                              isSelected ? 'bg-primary/20' : 'bg-muted'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {cmd.name}
                          </div>
                          {cmd.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {cmd.shortcut}
                          </span>
                        )}
                        {isSelected && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> di chuyen
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> chon
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> dong
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
