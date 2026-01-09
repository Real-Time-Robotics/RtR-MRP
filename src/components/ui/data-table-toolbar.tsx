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
  searchPlaceholder = 'Tìm kiếm...',
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
  addLabel = 'Thêm mới',
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
  const { data: session } = useSession();

  // Get user permissions
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;
  const userPermissions = userRole ? rolePermissions[userRole] || [] : [];

  const can = (permission?: Permission) => {
    if (!permission) return true;
    return userPermissions.includes(permission);
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== 'all');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Toolbar Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left Side - Search & Filters */}
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          {onSearchChange && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
              {searchValue && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Filter Button */}
          {onFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFilter}
              className={cn(
                'h-9',
                hasActiveFilters && 'border-blue-500 text-blue-600'
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Lọc
              {hasActiveFilters && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                  {Object.values(activeFilters).filter(v => v && v !== 'all').length}
                </span>
              )}
            </Button>
          )}

          {/* Refresh */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-9"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>

        {/* Right Side - Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Bulk Delete (when items selected) */}
          {selectedCount > 0 && onBulkDelete && can(deletePermission) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
              className="h-9"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa ({selectedCount})
            </Button>
          )}

          {/* Custom Actions */}
          {customActions}

          {/* Import */}
          {onImport && can(importPermission) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onImport}
              className="h-9"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importLabel}
            </Button>
          )}

          {/* Export */}
          {onExport && can(exportPermission) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-9"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportLabel}
            </Button>
          )}

          {/* Add New */}
          {onAdd && can(addPermission) && (
            <Button size="sm" onClick={onAdd} className="h-9">
              <Plus className="h-4 w-4 mr-2" />
            </Button>
          )}

          {/* Density Toggle */}
          {onDensityChange && (
            <div className="flex items-center border rounded-md overflow-hidden h-9 ml-2">
              <button
                onClick={() => onDensityChange('default')}
                title="Comfortable"
                className={cn(
                  "px-2 h-full flex items-center justify-center transition-colors border-r",
                  (!density || density === 'default')
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                    : "bg-white dark:bg-slate-950 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDensityChange('compact')}
                title="Compact"
                className={cn(
                  "px-2 h-full flex items-center justify-center transition-colors",
                  density === 'compact'
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                    : "bg-white dark:bg-slate-950 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                )}
              >
                <div className="flex flex-col gap-[2px]">
                  <div className="h-[1px] w-3 bg-current"></div>
                  <div className="h-[1px] w-3 bg-current"></div>
                  <div className="h-[1px] w-3 bg-current"></div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline Filters Row (optional) */}
      {filters && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters
            .filter(f => can(f.permission))
            .map(filter => (
              <Select
                key={filter.key}
                value={activeFilters[filter.key] || 'all'}
                onValueChange={(value) => onFilterChange?.(filter.key, value)}
              >
                <SelectTrigger className="h-8 w-auto min-w-[120px] text-sm">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả {filter.label}</SelectItem>
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
              className="h-8 text-gray-500"
            >
              <X className="h-4 w-4 mr-1" />
              Xóa bộ lọc
            </Button>
          )}
        </div>
      )}

      {/* Selection Info */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <span className="font-medium">{selectedCount}</span> mục đã chọn
        </div>
      )}
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
  addLabel = 'Thêm',
  isLoading = false,
  className,
}: CompactToolbarProps) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role as UserRole | undefined;
  const userPermissions = userRole ? rolePermissions[userRole] || [] : [];
  const can = (permission?: Permission) => !permission || userPermissions.includes(permission);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {onRefresh && (
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      )}
      {onAdd && can(addPermission) && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}

export default DataTableToolbar;
