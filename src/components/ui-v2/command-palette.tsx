'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Command,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  X,
  FileText,
  Settings,
  Users,
  Package,
  ShoppingCart,
  Factory,
  CheckSquare,
  BarChart3,
  Plus,
  Home,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// COMMAND PALETTE COMPONENT
// macOS Spotlight-style command palette (⌘K)
// =============================================================================

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  category?: string;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

export interface CommandGroup {
  title: string;
  items: CommandItem[];
}

export interface CommandPaletteProps {
  /** Open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Command items or groups */
  items: CommandItem[] | CommandGroup[];
  /** Placeholder text */
  placeholder?: string;
  /** Show recent items */
  recentItems?: CommandItem[];
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Search handler for async search */
  onSearch?: (query: string) => void;
  /** Custom footer */
  footer?: React.ReactNode;
}

// Check if items are grouped
const isGrouped = (items: CommandItem[] | CommandGroup[]): items is CommandGroup[] => {
  return items.length > 0 && 'items' in items[0];
};

// Default navigation items
export const defaultNavigationItems: CommandItem[] = [
  {
    id: 'nav-home',
    title: 'Go to Dashboard',
    subtitle: 'Home page',
    icon: <Home className="h-4 w-4" />,
    category: 'Navigation',
    keywords: ['home', 'dashboard', 'main'],
    action: () => window.location.href = '/dashboard',
  },
  {
    id: 'nav-inventory',
    title: 'Go to Inventory',
    subtitle: 'Manage parts and stock',
    icon: <Package className="h-4 w-4" />,
    category: 'Navigation',
    keywords: ['inventory', 'parts', 'stock', 'warehouse'],
    action: () => window.location.href = '/dashboard/inventory',
  },
  {
    id: 'nav-sales',
    title: 'Go to Sales',
    subtitle: 'Orders and customers',
    icon: <ShoppingCart className="h-4 w-4" />,
    category: 'Navigation',
    keywords: ['sales', 'orders', 'customers'],
    action: () => window.location.href = '/dashboard/sales',
  },
  {
    id: 'nav-production',
    title: 'Go to Production',
    subtitle: 'Work orders and BOMs',
    icon: <Factory className="h-4 w-4" />,
    category: 'Navigation',
    keywords: ['production', 'work orders', 'bom', 'manufacturing'],
    action: () => window.location.href = '/dashboard/production',
  },
  {
    id: 'nav-quality',
    title: 'Go to Quality',
    subtitle: 'NCRs and inspections',
    icon: <CheckSquare className="h-4 w-4" />,
    category: 'Navigation',
    keywords: ['quality', 'ncr', 'inspection', 'capa'],
    action: () => window.location.href = '/dashboard/quality',
  },
  {
    id: 'nav-analytics',
    title: 'Go to Analytics',
    subtitle: 'Reports and dashboards',
    icon: <BarChart3 className="h-4 w-4" />,
    category: 'Navigation',
    keywords: ['analytics', 'reports', 'charts', 'statistics'],
    action: () => window.location.href = '/dashboard/analytics',
  },
];

export const defaultActionItems: CommandItem[] = [
  {
    id: 'action-new-part',
    title: 'Create New Part',
    icon: <Plus className="h-4 w-4" />,
    category: 'Actions',
    shortcut: '⌘N',
    keywords: ['new', 'create', 'add', 'part'],
    action: () => {},
  },
  {
    id: 'action-new-order',
    title: 'Create Sales Order',
    icon: <Plus className="h-4 w-4" />,
    category: 'Actions',
    keywords: ['new', 'create', 'order', 'sales'],
    action: () => {},
  },
  {
    id: 'action-new-wo',
    title: 'Create Work Order',
    icon: <Plus className="h-4 w-4" />,
    category: 'Actions',
    keywords: ['new', 'create', 'work order', 'production'],
    action: () => {},
  },
  {
    id: 'action-settings',
    title: 'Open Settings',
    icon: <Settings className="h-4 w-4" />,
    category: 'Actions',
    shortcut: '⌘,',
    keywords: ['settings', 'preferences', 'config'],
    action: () => window.location.href = '/dashboard/settings',
  },
];

// Command Palette Component
const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  items,
  placeholder = 'Search commands...',
  recentItems = [],
  loading = false,
  emptyMessage = 'No results found',
  onSearch,
  footer,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Flatten groups to items
  const allItems = useMemo(() => {
    if (isGrouped(items)) {
      return items.flatMap((group) => group.items);
    }
    return items;
  }, [items]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Show recent items if no query
      return recentItems.length > 0 ? recentItems : allItems.slice(0, 10);
    }

    const searchTerms = query.toLowerCase().split(' ');
    return allItems.filter((item) => {
      const searchableText = [
        item.title,
        item.subtitle,
        item.category,
        ...(item.keywords || []),
      ].join(' ').toLowerCase();

      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [query, allItems, recentItems]);

  // Group filtered items
  const groupedFilteredItems = useMemo(() => {
    if (!query.trim() && recentItems.length > 0) {
      return [{ title: 'Recent', items: recentItems }];
    }

    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach((item) => {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return Object.entries(groups).map(([title, items]) => ({ title, items }));
  }, [filteredItems, query, recentItems]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex] && !filteredItems[selectedIndex].disabled) {
            filteredItems[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredItems, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle search
  useEffect(() => {
    if (onSearch) {
      onSearch(query);
    }
  }, [query, onSearch]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Need to handle this from parent
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  let itemIndex = -1;

  return (
    <div
      className="fixed inset-0 z-command flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          {loading ? (
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-slate-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-auto py-2">
          {groupedFilteredItems.length === 0 ? (
            <div className="py-8 text-center">
              <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{emptyMessage}</p>
            </div>
          ) : (
            groupedFilteredItems.map((group) => (
              <div key={group.title} className="px-2">
                {/* Group title */}
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </div>

                {/* Items */}
                {group.items.map((item) => {
                  itemIndex++;
                  const currentIndex = itemIndex;
                  const isSelected = selectedIndex === currentIndex;

                  return (
                    <button
                      key={item.id}
                      data-index={currentIndex}
                      onClick={() => {
                        if (!item.disabled) {
                          item.action();
                          onClose();
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      disabled={item.disabled}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                        'transition-colors',
                        isSelected && 'bg-primary-50 text-primary-900',
                        !isSelected && 'text-slate-700 hover:bg-slate-50',
                        item.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {/* Icon */}
                      {item.icon && (
                        <span
                          className={cn(
                            'flex-shrink-0',
                            isSelected ? 'text-primary-600' : 'text-slate-400'
                          )}
                        >
                          {item.icon}
                        </span>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-slate-500 truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Shortcut */}
                      {item.shortcut && (
                        <span className="flex-shrink-0 text-xs text-slate-400 font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          {footer || (
            <>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" />
                  select
                </span>
                <span className="flex items-center gap-1">
                  esc close
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Command className="h-3 w-3" />K
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

CommandPalette.displayName = 'CommandPalette';

// =============================================================================
// COMMAND PALETTE PROVIDER
// Global command palette with keyboard shortcut
// =============================================================================

export interface CommandPaletteProviderProps {
  children: React.ReactNode;
  items?: CommandItem[];
}

export const CommandPaletteContext = React.createContext<{
  open: () => void;
  close: () => void;
  isOpen: boolean;
}>({
  open: () => {},
  close: () => {},
  isOpen: false,
});

export const useCommandPalette = () => React.useContext(CommandPaletteContext);

export const CommandPaletteProvider: React.FC<CommandPaletteProviderProps> = ({
  children,
  items = [...defaultNavigationItems, ...defaultActionItems],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open, close, isOpen }}>
      {children}
      <CommandPalette isOpen={isOpen} onClose={close} items={items} />
    </CommandPaletteContext.Provider>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export { CommandPalette };
export default CommandPalette;
