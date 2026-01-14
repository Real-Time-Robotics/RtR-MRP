'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Star, CheckCircle, XCircle, Building2, AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import { DeleteSupplierDialog, Supplier } from '@/components/forms/supplier-form';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, createSupplierActions } from '@/components/ui/action-dropdown';
import { useDataExport } from '@/hooks/use-data-export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DataTable, Column } from '@/components/ui-v2/data-table';

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

  return (
    // COMPACT: gap-4 → gap-2
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <Card className="border-gray-200 dark:border-mrp-border">
        {/* COMPACT: pt-4 → p-3 */}
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono">{suppliers.length}</div>
          <p className="text-[10px] text-muted-foreground">Tổng nhà cung cấp</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-green-600">{active}</div>
          <p className="text-[10px] text-muted-foreground">Đang hoạt động</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-blue-600">{ndaaCompliant}</div>
          <p className="text-[10px] text-muted-foreground">NDAA Compliant</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono">{avgLeadTime} ngày</div>
          <p className="text-[10px] text-muted-foreground">Lead Time TB</p>
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


  const { exportToExcel } = useDataExport();

  const handleExport = () => {
    if (!suppliers || suppliers.length === 0) {
      toast.warning('Không có dữ liệu để export');
      return;
    }

    exportToExcel(suppliers, {
      fileName: 'Suppliers_List',
      sheetName: 'Suppliers'
    });

    toast.success('Đã xuất file Excel');
  };

  const handleImport = () => {
    toast.info('Tính năng import đang được phát triển');
  };

  // Get unique countries for filter
  const countries = Array.from(new Set(suppliers.map((s) => s.country))).sort();

  // Column definitions for DataTable
  const columns: Column<Supplier>[] = useMemo(() => [
    {
      key: 'code',
      header: 'Mã NCC',
      width: '100px',
      sortable: true,
      render: (value) => <span className="font-mono font-medium">{value}</span>,
    },
    {
      key: 'name',
      header: 'Tên nhà cung cấp',
      width: '180px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'country',
      header: 'Quốc gia',
      width: '100px',
      sortable: true,
    },
    {
      key: 'rating',
      header: 'Rating',
      width: '80px',
      align: 'center',
      render: (value) => (
        <div className="flex items-center justify-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'h-3 w-3',
                star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
              )}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'leadTimeDays',
      header: 'Lead Time',
      width: '80px',
      align: 'right',
      sortable: true,
      render: (value) => <span className="text-xs">{value} ngày</span>,
    },
    {
      key: 'ndaaCompliant',
      header: 'NDAA',
      width: '70px',
      align: 'center',
      render: (value) => (
        value ? (
          <CheckCircle className="h-3 w-3 text-green-500 mx-auto" />
        ) : (
          <XCircle className="h-3 w-3 text-red-500 mx-auto" />
        )
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '100px',
      align: 'center',
      sortable: true,
      render: (value) => (
        <Badge
          variant={value === 'active' ? 'default' : 'secondary'}
          className={cn(
            value === 'active' && 'bg-green-100 text-green-700',
            'text-[10px] px-1 py-0'
          )}
        >
          {value === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (_, row) => (
        <ActionDropdown
          items={createSupplierActions(
            row.id,
            () => handleEdit(row),
            () => handleDelete(row)
          )}
        />
      ),
    },
  ], []);

  return (
    // COMPACT: space-y-6 → space-y-3
    <div className="space-y-3">
      {/* Header - COMPACT */}
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
          <Building2 className="h-4 w-4" />
          Quản lý Nhà cung cấp
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
          Quản lý danh sách nhà cung cấp và thông tin liên hệ
        </p>
      </div>

      {/* Stats */}
      <StatsCards suppliers={suppliers} />

      {/* Table Card - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
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
        <CardContent className="p-0">
          <DataTable
            data={filteredSuppliers}
            columns={columns}
            keyField="id"
            loading={fetchState.loading}
            emptyMessage="Chưa có nhà cung cấp nào"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            pagination
            pageSize={20}
            searchable={false}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'Suppliers',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SupplierFormDialog
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
