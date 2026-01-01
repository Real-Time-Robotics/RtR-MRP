'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Package,
  Layers,
  Building2,
  ShoppingCart,
  ClipboardList,
  Calculator,
  Truck,
  Factory,
  CheckCircle,
  BarChart3,
  Sparkles,
  Settings,
  FileText,
  Plus,
  ArrowRight,
  Command,
  CornerDownLeft,
  Hash,
  Loader2,
  X,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// COMMAND PALETTE (Ctrl+K / Cmd+K)
// Spotlight-style quick navigation and actions
// =============================================================================

// Types
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
  category: 'navigation' | 'action' | 'recent' | 'search';
}

interface CommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}

// =============================================================================
// COMMAND DATA
// =============================================================================

const navigationCommands: CommandItem[] = [
  { id: 'nav-dashboard', label: 'Tổng quan', description: 'Dashboard chính', icon: <LayoutDashboard className="w-4 h-4" />, action: () => {}, keywords: ['dashboard', 'home', 'trang chủ'], category: 'navigation' },
  { id: 'nav-parts', label: 'Danh mục vật tư', description: 'Quản lý parts master', icon: <Package className="w-4 h-4" />, action: () => {}, keywords: ['parts', 'vật tư', 'linh kiện'], category: 'navigation' },
  { id: 'nav-bom', label: 'Định mức BOM', description: 'Bill of Materials', icon: <Layers className="w-4 h-4" />, action: () => {}, keywords: ['bom', 'định mức', 'công thức'], category: 'navigation' },
  { id: 'nav-suppliers', label: 'Nhà cung cấp', description: 'Quản lý suppliers', icon: <Building2 className="w-4 h-4" />, action: () => {}, keywords: ['suppliers', 'ncc', 'vendor'], category: 'navigation' },
  { id: 'nav-sales', label: 'Đơn hàng', description: 'Sales orders', icon: <ShoppingCart className="w-4 h-4" />, action: () => {}, keywords: ['sales', 'orders', 'đơn hàng'], category: 'navigation' },
  { id: 'nav-inventory', label: 'Tồn kho', description: 'Inventory management', icon: <ClipboardList className="w-4 h-4" />, action: () => {}, keywords: ['inventory', 'tồn kho', 'stock'], category: 'navigation' },
  { id: 'nav-mrp', label: 'Hoạch định MRP', description: 'Material Requirements Planning', icon: <Calculator className="w-4 h-4" />, action: () => {}, keywords: ['mrp', 'planning', 'hoạch định'], category: 'navigation' },
  { id: 'nav-purchasing', label: 'Mua hàng', description: 'Purchase orders', icon: <Truck className="w-4 h-4" />, action: () => {}, keywords: ['purchasing', 'po', 'mua hàng'], category: 'navigation' },
  { id: 'nav-production', label: 'Sản xuất', description: 'Work orders', icon: <Factory className="w-4 h-4" />, action: () => {}, keywords: ['production', 'sản xuất', 'work order'], category: 'navigation' },
  { id: 'nav-quality', label: 'Chất lượng', description: 'Quality control', icon: <CheckCircle className="w-4 h-4" />, action: () => {}, keywords: ['quality', 'qc', 'chất lượng', 'ncr'], category: 'navigation' },
  { id: 'nav-analytics', label: 'Báo cáo', description: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" />, action: () => {}, keywords: ['analytics', 'reports', 'báo cáo'], category: 'navigation' },
  { id: 'nav-ai', label: 'Trợ lý AI', description: 'AI Insights', icon: <Sparkles className="w-4 h-4" />, action: () => {}, keywords: ['ai', 'assistant', 'trợ lý'], category: 'navigation' },
  { id: 'nav-settings', label: 'Cài đặt', description: 'System settings', icon: <Settings className="w-4 h-4" />, action: () => {}, keywords: ['settings', 'cài đặt', 'config'], category: 'navigation' },
];

const actionCommands: CommandItem[] = [
  { id: 'action-new-order', label: 'Tạo đơn hàng mới', icon: <Plus className="w-4 h-4" />, action: () => {}, keywords: ['new order', 'tạo đơn'], shortcut: '⌘N', category: 'action' },
  { id: 'action-new-part', label: 'Thêm vật tư mới', icon: <Plus className="w-4 h-4" />, action: () => {}, keywords: ['new part', 'thêm vật tư'], category: 'action' },
  { id: 'action-run-mrp', label: 'Chạy MRP', icon: <Zap className="w-4 h-4" />, action: () => {}, keywords: ['run mrp', 'chạy mrp'], shortcut: '⌘M', category: 'action' },
  { id: 'action-receive', label: 'Nhập kho', icon: <Package className="w-4 h-4" />, action: () => {}, keywords: ['receive', 'nhập kho'], shortcut: '⌘I', category: 'action' },
  { id: 'action-report', label: 'Xuất báo cáo', icon: <FileText className="w-4 h-4" />, action: () => {}, keywords: ['export', 'xuất', 'báo cáo'], shortcut: '⌘R', category: 'action' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CommandPalette({ isOpen: controlledIsOpen, onClose }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use controlled state if provided
  const open = controlledIsOpen !== undefined ? controlledIsOpen : isOpen;
  const setOpen = onClose ? (value: boolean) => !value && onClose() : setIsOpen;

  // Navigation action handler
  const navigate = useCallback((path: string) => {
    setOpen(false);
    router.push(path);
  }, [router, setOpen]);

  // Build commands with navigation actions
  const commands = useMemo(() => {
    const navWithActions = navigationCommands.map((cmd) => ({
      ...cmd,
      action: () => {
        const pathMap: Record<string, string> = {
          'nav-dashboard': '/dashboard',
          'nav-parts': '/parts',
          'nav-bom': '/bom',
          'nav-suppliers': '/suppliers',
          'nav-sales': '/sales',
          'nav-inventory': '/inventory',
          'nav-mrp': '/mrp',
          'nav-purchasing': '/purchasing',
          'nav-production': '/production',
          'nav-quality': '/quality',
          'nav-analytics': '/analytics',
          'nav-ai': '/ai-insights',
          'nav-settings': '/settings',
        };
        navigate(pathMap[cmd.id] || '/dashboard');
      },
    }));

    const actionsWithNav = actionCommands.map((cmd) => ({
      ...cmd,
      action: () => {
        const pathMap: Record<string, string> = {
          'action-new-order': '/sales/new',
          'action-new-part': '/parts/new',
          'action-run-mrp': '/mrp/wizard',
          'action-receive': '/inventory/receive',
          'action-report': '/analytics',
        };
        navigate(pathMap[cmd.id] || '/dashboard');
      },
    }));

    return [...navWithActions, ...actionsWithNav];
  }, [navigate]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return [
        { id: 'nav', label: 'Điều hướng', items: commands.filter((c) => c.category === 'navigation').slice(0, 6) },
        { id: 'actions', label: 'Hành động', items: commands.filter((c) => c.category === 'action') },
      ];
    }

    const lowerQuery = query.toLowerCase();
    const filtered = commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(lowerQuery);
      const matchDescription = cmd.description?.toLowerCase().includes(lowerQuery);
      const matchKeywords = cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery));
      return matchLabel || matchDescription || matchKeywords;
    });

    return [{ id: 'results', label: 'Kết quả', items: filtered }];
  }, [query, commands]);

  // Flatten items for keyboard navigation
  const flatItems = useMemo(() => {
    return filteredCommands.flatMap((group) => group.items);
  }, [filteredCommands]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }

      // Close with Escape
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation within palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].action();
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed inset-x-4 top-[20%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tìm kiếm hoặc nhập lệnh..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-500">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {flatItems.length === 0 ? (
              <div className="py-8 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Không tìm thấy kết quả</p>
                <p className="text-sm text-gray-400 mt-1">Thử tìm kiếm với từ khóa khác</p>
              </div>
            ) : (
              <>
                {filteredCommands.map((group) => (
                  <div key={group.id} className="mb-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {group.label}
                    </div>
                    {group.items.map((item) => {
                      const index = flatItems.indexOf(item);
                      const isSelected = index === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          data-index={index}
                          onClick={() => item.action()}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
                            'transition-colors duration-100',
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          )}
                        >
                          <div className={cn(
                            'p-2 rounded-lg',
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/50'
                              : 'bg-gray-100 dark:bg-gray-700'
                          )}>
                            {item.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{item.label}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                            )}
                          </div>
                          {item.shortcut && (
                            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-500">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && (
                            <CornerDownLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">↑↓</kbd>
                Điều hướng
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">↵</kbd>
                Chọn
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Powered by RTR MRP
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// COMMAND PALETTE TRIGGER
// =============================================================================

export function CommandPaletteTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl',
          'bg-gray-100 dark:bg-gray-800',
          'text-gray-500 dark:text-gray-400',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
          'transition-colors'
        )}
      >
        <Search className="w-4 h-4" />
        <span className="text-sm hidden sm:block">Tìm kiếm...</span>
        <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>
      <CommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default CommandPalette;
