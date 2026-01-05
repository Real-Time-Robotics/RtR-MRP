'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, CheckCircle, XCircle, Building2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, createSupplierActions } from '@/components/ui/action-dropdown';
import { SupplierForm, DeleteSupplierDialog, Supplier } from '@/components/forms/supplier-form';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface SuppliersTableProps {
  initialData?: Supplier[];
}

interface FetchState {
  loading: boolean;
  error: string | null;
}

// =============================================================================
// STATS CARDS
// =============================================================================

function StatsCards({ suppliers }: { suppliers: Supplier[] }) {
  const active = suppliers.filter((s) => s.status === 'active').length;
  const ndaaCompliant = suppliers.filter((s) => s.ndaaCompliant).length;
  const avgLeadTime =
    suppliers.length > 0
      ? Math.round(suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / suppliers.length)
      : 0;
  const avgRating =
    suppliers.filter((s) => s.rating).length > 0
      ? (
          suppliers.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
          suppliers.filter((s) => s.rating).length
        ).toFixed(1)
      : '-';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{suppliers.length}</div>
          <p className="text-xs text-muted-foreground">Tổng nhà cung cấp</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{active}</div>
          <p className="text-xs text-muted-foreground">Đang hoạt động</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-blue-600">{ndaaCompliant}</div>
          <p className="text-xs text-muted-foreground">NDAA Compliant</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{avgLeadTime} ngày</div>
          <p className="text-xs text-muted-foreground">Lead Time TB</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SuppliersTable({ initialData = [] }: SuppliersTableProps) {
  const router = useRouter();

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialData);
  const [fetchState, setFetchState] = useState<FetchState>({ loading: false, error: null });
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'all',
    country: 'all',
  });

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    setFetchState({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.status !== 'all') params.set('status', filters.status);

      const response = await fetch(`/api/suppliers?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch suppliers');
      }

      setSuppliers(result.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      setFetchState({
        loading: false,
        error: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      });
    } finally {
      setFetchState((prev) => ({ ...prev, loading: false }));
    }
  }, [search, filters]);

  // Load data on mount and when search/filters change
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Filtered data
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (filters.country !== 'all' && supplier.country !== filters.country) {
      return false;
    }
    return true;
  });

  // Handlers
  const handleAdd = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setDeleteOpen(true);
  };

  const handleFormSuccess = () => {
    fetchSuppliers();
  };

  const handleDeleteSuccess = () => {
    fetchSuppliers();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} nhà cung cấp?`)) {
      return;
    }

    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
        )
      );

      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        toast.error(`Không thể xóa ${failedCount} nhà cung cấp`);
      } else {
        toast.success(`Đã xóa ${selectedIds.size} nhà cung cấp`);
      }

      fetchSuppliers();
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
    if (selectedIds.size === filteredSuppliers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSuppliers.map((s) => s.id)));
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

  // Get unique countries for filter
  const countries = Array.from(new Set(suppliers.map((s) => s.country))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Quản lý Nhà cung cấp
        </h1>
        <p className="text-muted-foreground">
          Quản lý danh sách nhà cung cấp và thông tin liên hệ
        </p>
      </div>

      {/* Stats */}
      <StatsCards suppliers={suppliers} />

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm nhà cung cấp..."
            onAdd={handleAdd}
            onImport={handleImport}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
            onRefresh={fetchSuppliers}
            addPermission="orders:create"
            deletePermission="orders:delete"
            addLabel="Thêm nhà cung cấp"
            selectedCount={selectedIds.size}
            isLoading={fetchState.loading}
            filters={[
              {
                key: 'status',
                label: 'Trạng thái',
                options: [
                  { value: 'active', label: 'Hoạt động' },
                  { value: 'inactive', label: 'Ngưng' },
                  { value: 'pending', label: 'Chờ duyệt' },
                ],
              },
              {
                key: 'country',
                label: 'Quốc gia',
                options: countries.map((c) => ({ value: c, label: c })),
              },
            ]}
            activeFilters={filters}
            onFilterChange={(key, value) =>
              setFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClearFilters={() => setFilters({ status: 'all', country: 'all' })}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredSuppliers.length > 0 &&
                      selectedIds.size === filteredSuppliers.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Tên nhà cung cấp</TableHead>
                <TableHead>Quốc gia</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead className="text-center">Lead Time</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">NDAA</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetchState.loading && suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {search || filters.status !== 'all' || filters.country !== 'all'
                        ? 'Không tìm thấy nhà cung cấp phù hợp'
                        : 'Chưa có nhà cung cấp nào'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className={cn(selectedIds.has(supplier.id) && 'bg-muted/50')}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(supplier.id)}
                        onCheckedChange={() => toggleSelect(supplier.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {supplier.code}
                    </TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.country}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {supplier.category || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.leadTimeDays} ngày
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.rating ? (
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span>{supplier.rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {supplier.ndaaCompliant ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          supplier.status === 'active'
                            ? 'default'
                            : supplier.status === 'inactive'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={cn(
                          supplier.status === 'active' && 'bg-green-100 text-green-700',
                          supplier.status === 'inactive' && 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {supplier.status === 'active'
                          ? 'Hoạt động'
                          : supplier.status === 'inactive'
                          ? 'Ngưng'
                          : 'Chờ duyệt'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ActionDropdown
                        items={createSupplierActions(
                          supplier.id,
                          () => handleEdit(supplier),
                          () => handleDelete(supplier)
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SupplierForm
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editingSupplier}
        onSuccess={handleFormSuccess}
      />

      <DeleteSupplierDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        supplier={deletingSupplier}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

export default SuppliersTable;
