'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { PartForm, DeletePartDialog, Part } from '@/components/forms/part-form';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const LIFECYCLE_COLORS: Record<string, string> = {
  DEVELOPMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  PROTOTYPE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PHASE_OUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  OBSOLETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  EOL: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const MAKE_BUY_COLORS: Record<string, string> = {
  MAKE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  BUY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  BOTH: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// =============================================================================
// STATS CARDS
// =============================================================================

function StatsCards({ parts }: { parts: Part[] }) {
  const stats = {
    total: parts.length,
    active: parts.filter((p) => p.lifecycleStatus === 'ACTIVE').length,
    ndaaCompliant: parts.filter((p) => p.ndaaCompliant).length,
    critical: parts.filter((p) => p.isCritical).length,
    make: parts.filter((p) => p.makeOrBuy === 'MAKE').length,
    buy: parts.filter((p) => p.makeOrBuy === 'BUY').length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Parts</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">NDAA</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.ndaaCompliant}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.critical}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-500" />
            <span className="text-xs text-muted-foreground">Make</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{stats.make}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Buy</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.buy}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PartsTable() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({
    category: 'all',
    lifecycle: 'all',
    makeOrBuy: 'all',
  });

  // Fetch parts
  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.lifecycle !== 'all') params.set('lifecycleStatus', filters.lifecycle);
      if (filters.makeOrBuy !== 'all') params.set('makeOrBuy', filters.makeOrBuy);

      const response = await fetch(`/api/parts?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setParts(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch parts:', error);
      toast.error('Không thể tải danh sách parts');
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Filtered parts (client-side additional filtering)
  const filteredParts = parts;

  // Handlers
  const handleAdd = () => {
    setEditingPart(null);
    setFormOpen(true);
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setFormOpen(true);
  };

  const handleDelete = (part: Part) => {
    setDeletingPart(part);
    setDeleteOpen(true);
  };

  const handleFormSuccess = () => {
    fetchParts();
  };

  const handleDeleteSuccess = () => {
    fetchParts();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} parts?`)) {
      return;
    }

    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/parts/${id}`, { method: 'DELETE' })
        )
      );

      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        toast.error(`Không thể xóa ${failedCount} parts`);
      } else {
        toast.success(`Đã xóa ${selectedIds.size} parts`);
      }

      fetchParts();
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa');
    }
  };

  const handleExport = () => {
    toast.info('Tính năng export đang được phát triển');
  };

  const handleImport = () => {
    toast.info('Tính năng import đang được phát triển');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredParts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredParts.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Get unique categories
  const categories = Array.from(new Set(parts.map((p) => p.category))).sort();

  // Create action items for each row
  const createPartActions = (part: Part): ActionDropdownItem[] => [
    {
      label: 'Xem chi tiết',
      href: `/parts/${part.id}`,
    },
    {
      label: 'Chỉnh sửa',
      onClick: () => handleEdit(part),
      permission: 'orders:edit',
    },
    { type: 'separator' },
    {
      label: 'Xóa',
      onClick: () => handleDelete(part),
      permission: 'orders:delete',
      variant: 'destructive',
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Parts Master
          </h1>
          <p className="text-muted-foreground">
            Quản lý danh sách parts với AS9100/ITAR compliance
          </p>
        </div>

        {/* Stats */}
        <StatsCards parts={parts} />

        {/* Table Card */}
        <Card>
          <CardHeader className="pb-4">
            <DataTableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Tìm kiếm part number, tên, manufacturer..."
              onAdd={handleAdd}
              onImport={handleImport}
              onExport={handleExport}
              onBulkDelete={handleBulkDelete}
              onRefresh={fetchParts}
              addPermission="orders:create"
              deletePermission="orders:delete"
              addLabel="Thêm Part"
              selectedCount={selectedIds.size}
              isLoading={loading}
              filters={[
                {
                  key: 'category',
                  label: 'Danh mục',
                  options: categories.map((c) => ({ value: c, label: c })),
                },
                {
                  key: 'lifecycle',
                  label: 'Lifecycle',
                  options: [
                    { value: 'DEVELOPMENT', label: 'Development' },
                    { value: 'PROTOTYPE', label: 'Prototype' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'PHASE_OUT', label: 'Phase Out' },
                    { value: 'OBSOLETE', label: 'Obsolete' },
                    { value: 'EOL', label: 'End of Life' },
                  ],
                },
                {
                  key: 'makeOrBuy',
                  label: 'Make/Buy',
                  options: [
                    { value: 'MAKE', label: 'Make' },
                    { value: 'BUY', label: 'Buy' },
                    { value: 'BOTH', label: 'Both' },
                  ],
                },
              ]}
              activeFilters={filters}
              onFilterChange={(key, value) =>
                setFilters((prev) => ({ ...prev, [key]: value }))
              }
              onClearFilters={() =>
                setFilters({ category: 'all', lifecycle: 'all', makeOrBuy: 'all' })
              }
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredParts.length > 0 &&
                        selectedIds.size === filteredParts.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Part #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Make/Buy</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead className="text-center">Compliance</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        Đang tải...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">Không tìm thấy parts</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParts.map((part) => (
                    <TableRow
                      key={part.id}
                      className={cn(selectedIds.has(part.id) && 'bg-muted/50')}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(part.id)}
                          onCheckedChange={() => toggleSelect(part.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        <Link
                          href={`/parts/${part.id}`}
                          className="hover:underline text-primary"
                        >
                          {part.partNumber}
                        </Link>
                        {part.isCritical && (
                          <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48 truncate">{part.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={MAKE_BUY_COLORS[part.makeOrBuy] || ''}>
                          {part.makeOrBuy}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{part.revision}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger>
                              {part.ndaaCompliant ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              NDAA: {part.ndaaCompliant ? 'Compliant' : 'Non-compliant'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              {part.itarControlled ? (
                                <Shield className="h-4 w-4 text-red-500" />
                              ) : (
                                <div className="h-4 w-4" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              ITAR: {part.itarControlled ? 'Controlled' : 'Not controlled'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              {part.rohsCompliant ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-yellow-500" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              RoHS: {part.rohsCompliant ? 'Compliant' : 'Non-compliant'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(part.unitCost)}
                      </TableCell>
                      <TableCell>
                        <Badge className={LIFECYCLE_COLORS[part.lifecycleStatus] || ''}>
                          {part.lifecycleStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ActionDropdown items={createPartActions(part)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <PartForm
          open={formOpen}
          onOpenChange={setFormOpen}
          part={editingPart}
          onSuccess={handleFormSuccess}
        />

        <DeletePartDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          part={deletingPart}
          onSuccess={handleDeleteSuccess}
        />
      </div>
    </TooltipProvider>
  );
}

export default PartsTable;
