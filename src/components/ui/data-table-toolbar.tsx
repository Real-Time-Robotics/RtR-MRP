'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Permission, rolePermissions, UserRole } from '@/lib/auth/auth-types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';

// =============================================================================
// DATA TABLE TOOLBAR
// Toolbar with permission-aware action buttons for data tables
// =============================================================================

interface DataTableToolbarProps {
  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Actions
  onAdd?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onBulkDelete?: () => void;
  onRefresh?: () => void;
  onFilter?: () => void;

  // Permissions
  addPermission?: Permission;
  importPermission?: Permission;
  exportPermission?: Permission;
  deletePermission?: Permission;

  // Labels
  addLabel?: string;
  importLabel?: string;
  exportLabel?: string;

  // State
  selectedCount?: number;
  isLoading?: boolean;

  // Filter state
  filters?: FilterConfig[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;

  // Custom actions (rendered before standard buttons)
  customActions?: React.ReactNode;

  // Style
  className?: string;

  // View Options
  density?: 'default' | 'compact';
  onDensityChange?: (density: 'default' | 'compact') => void;
}

interface FilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  permission?: Permission;
}

export function DataTableToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  onAdd,
  onImport,
  onExport,
  onBulkDelete,
  onRefresh,
  onFilter,
  addPermission,
  importPermission = 'reports:export',
  exportPermission = 'reports:export',
  deletePermission,
  addLabel,
  importLabel = 'Import',
  exportLabel = 'Export',
  selectedCount = 0,
  isLoading = false,
  filters,
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  customActions,
  className,
  density,
  onDensityChange,
}: DataTableToolbarProps) {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const resolvedSearchPlaceholder = searchPlaceholder || t("toolbar.search");
  const resolvedAddLabel = addLabel || t("toolbar.addNew");

  // Get user permissions
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;
  const userPermissions = userRole ? rolePermissions[userRole] || [] : [];

  const can = (permission?: Permission) => {
    // DEBUG: Always allow
    return true;
    // if (!permission) return true;
    // return userPermissions.includes(permission);
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== 'all');

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Single-row compact toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Search - compact */}
        {onSearchChange && (
          <div className="relative w-48 lg:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder={resolvedSearchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
              aria-label={resolvedSearchPlaceholder}
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Inline Filters - compact, same row */}
        {filters && filters.length > 0 && filters
          .filter(f => can(f.permission))
          .map(filter => (
            <Select
              key={filter.key}
              value={activeFilters[filter.key] || 'all'}
              onValueChange={(value) => onFilterChange?.(filter.key, value)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("toolbar.allFilter", { label: filter.label })}</SelectItem>
                {filter.options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2 text-xs text-gray-500"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Filter Button */}
        {onFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFilter}
            className={cn(
              'h-8 px-2',
              hasActiveFilters && 'text-blue-600'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            {hasActiveFilters && (
              <span className="ml-1 text-xs font-medium">
                {Object.values(activeFilters).filter(v => v && v !== 'all').length}
              </span>
            )}
          </Button>
        )}

        {/* Refresh */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8"
            aria-label="Refresh data"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bulk Delete (when items selected) */}
        {selectedCount > 0 && onBulkDelete && can(deletePermission) && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            className="h-8 text-xs px-2.5"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t("toolbar.deleteCount", { count: String(selectedCount) })}
          </Button>
        )}

        {/* Selection Info - inline badge */}
        {selectedCount > 0 && (
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {t("toolbar.selectedCount", { count: String(selectedCount) })}
          </span>
        )}

        {/* Custom Actions */}
        {customActions}

        {/* Import - icon only */}
        {onImport && can(importPermission) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onImport}
            className="h-8 w-8"
            title={importLabel}
            aria-label={importLabel}
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Export - icon only */}
        {onExport && can(exportPermission) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onExport}
            className="h-8 w-8"
            title={exportLabel}
            aria-label={exportLabel}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Density Toggle */}
        {onDensityChange && (
          <div className="flex items-center border rounded overflow-hidden h-8">
            <button
              onClick={() => onDensityChange('default')}
              title="Comfortable"
              aria-label="Comfortable density"
              aria-pressed={!density || density === 'default'}
              className={cn(
                "px-1.5 h-full flex items-center justify-center transition-colors border-r",
                (!density || density === 'default')
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  : "bg-white dark:bg-slate-950 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDensityChange('compact')}
              title="Compact"
              aria-label="Compact density"
              aria-pressed={density === 'compact'}
              className={cn(
                "px-1.5 h-full flex items-center justify-center transition-colors",
                density === 'compact'
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  : "bg-white dark:bg-slate-950 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
              )}
            >
              <div className="flex flex-col gap-[2px]">
                <div className="h-[1px] w-2.5 bg-current"></div>
                <div className="h-[1px] w-2.5 bg-current"></div>
                <div className="h-[1px] w-2.5 bg-current"></div>
              </div>
            </button>
          </div>
        )}

        {/* Add New - primary CTA, always visible with label */}
        {onAdd && can(addPermission) && (
          <Button size="sm" onClick={onAdd} className="h-8 text-xs px-3">
            <Plus className="h-3.5 w-3.5 mr-1" />
            {resolvedAddLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT TOOLBAR (for smaller spaces)
// =============================================================================

interface CompactToolbarProps {
  onAdd?: () => void;
  onRefresh?: () => void;
  addPermission?: Permission;
  addLabel?: string;
  isLoading?: boolean;
  className?: string;
}

export function CompactToolbar({
  onAdd,
  onRefresh,
  addPermission,
  addLabel,
  isLoading = false,
  className,
}: CompactToolbarProps) {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;
  const userPermissions = userRole ? rolePermissions[userRole] || [] : [];
  const can = (permission?: Permission) => !permission || userPermissions.includes(permission);
  const resolvedAddLabel = addLabel || t("toolbar.add");

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {onRefresh && (
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading} aria-label="Refresh">
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      )}
      {onAdd && can(addPermission) && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          {resolvedAddLabel}
        </Button>
      )}
    </div>
  );
}

export default DataTableToolbar;
