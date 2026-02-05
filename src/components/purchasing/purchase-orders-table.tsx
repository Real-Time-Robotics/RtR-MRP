'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Truck, DollarSign, FileText, Calendar, Package } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { PurchaseOrderForm, DeletePurchaseOrderDialog, PurchaseOrder } from '@/components/forms/purchase-order-form';
import { POStatusBadge } from '@/components/purchasing/po-status-badge';
import { toast } from 'sonner';
import { formatDateShort } from '@/lib/date';
import { DataTable, Column } from '@/components/ui-v2/data-table';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/export';
import { formatCurrency as formatCurrencyUtil } from '@/lib/currency';

// =============================================================================
// TYPES
// =============================================================================

interface PurchaseOrdersTableProps {
  initialData?: PurchaseOrder[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// =============================================================================
// STATS CARDS
// =============================================================================

function StatsCards({ orders }: { orders: PurchaseOrder[] }) {
  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = orders.filter((o) => !['received', 'cancelled'].includes(o.status));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{orders.length}</div>
          <p className="text-xs text-muted-foreground">Tổng PO</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground">Tổng giá trị</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-amber-600">{pendingOrders.length}</div>
          <p className="text-xs text-muted-foreground">Đang xử lý</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-blue-600">
            {orders.filter((o) => o.status === 'received').length}
          </div>
          <p className="text-xs text-muted-foreground">Đã nhận</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PurchaseOrdersTable({ initialData = [] }: PurchaseOrdersTableProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Check URL params for "Deep Link" actions (e.g., from AI Copilot)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create' && !formOpen) {
      const partId = searchParams.get('partId');
      const quantity = searchParams.get('quantity');
      const supplierId = searchParams.get('supplierId');
      const unitPrice = searchParams.get('unitPrice');
      const notes = searchParams.get('notes');

      const initialLines = partId ? [{
        partId: partId,
        quantity: quantity ? parseInt(quantity) : 1,
        unitPrice: unitPrice ? parseFloat(unitPrice) : 0
      }] : [];

      setEditingOrder(null);
      setInitialFormData({
        supplierId: supplierId || '',
        lines: initialLines,
        notes: notes || '',
      });
      setFormOpen(true);

      // Clear params to avoid loop / dirty URL
      router.replace('/purchasing');
    }
  }, [searchParams, formOpen, router]);

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'all',
  });

  // Fetch orders
  const fetchOrders = useCallback(async (searchTerm?: string, statusFilter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/purchase-orders?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setOrders(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch POs:', error);
      toast.error('Không thể tải danh sách PO');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount and when search/filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrders(search, filters.status);
    }, search ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [search, filters.status, fetchOrders]);

  // Handlers
  const handleAdd = () => {
    setEditingOrder(null);
    setFormOpen(true);
  };

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormOpen(true);
  };

  const handleDelete = (order: PurchaseOrder) => {
    setDeletingOrder(order);
    setDeleteOpen(true);
  };

  const handleFormSuccess = () => {
    fetchOrders(search, filters.status);
  };

  const handleDeleteSuccess = () => {
    fetchOrders(search, filters.status);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa/hủy ${selectedIds.size} PO?`)) {
      return;
    }

    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' })
        )
      );

      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        toast.error(`Không thể xóa/hủy ${failedCount} PO`);
      } else {
        toast.success(`Đã xóa/hủy ${selectedIds.size} PO`);
      }

      fetchOrders(search, filters.status);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleExport = () => {
    if (orders.length === 0) {
      toast.info('Không có dữ liệu để xuất');
      return;
    }

    const exportColumns: ExportColumn[] = [
      { key: 'poNumber', header: 'PO Number', width: 12 },
      { key: 'supplier', header: 'Supplier', width: 25, format: (v) => v?.name || '-' },
      { key: 'orderDate', header: 'Order Date', width: 12, type: 'date' },
      { key: 'expectedDate', header: 'Expected Date', width: 12, type: 'date' },
      { key: 'linesCount', header: 'Items', width: 8, type: 'number', align: 'center', format: (_, row) => row.lines?.length || 0 },
      { key: 'totalAmount', header: 'Total Amount', width: 15, type: 'currency', align: 'right' },
      { key: 'status', header: 'Status', width: 12, format: (v) => v?.replace('_', ' ').toUpperCase() || '-' },
    ];

    const totalValue = orders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

    exportToExcel(orders, exportColumns, {
      title: 'Purchase Orders Report',
      filename: 'purchase-orders',
      sheetName: 'Purchase Orders',
    }, [
      ['Total Purchase Orders', orders.length.toString()],
      ['Total Value', formatCurrencyUtil(totalValue)],
      ['Pending Orders', orders.filter(po => !['received', 'cancelled'].includes(po.status)).length.toString()],
    ]);

    toast.success('Đã xuất file Excel thành công');
  };

  const handleImport = () => {
    toast.info('Tính năng import đang được phát triển');
  };

  // Create action items for each row
  const createPOActions = (order: PurchaseOrder): ActionDropdownItem[] => [
    {
      label: 'Xem chi tiết',
      href: `/purchasing/${order.id}`,
    },
    {
      label: 'Chỉnh sửa',
      onClick: () => handleEdit(order),
      permission: 'orders:edit',
      disabled: !['draft', 'pending', 'confirmed'].includes(order.status),
    },
    {
      label: order.status === 'draft' ? 'Xóa' : 'Hủy PO',
      onClick: () => handleDelete(order),
      permission: 'orders:delete',
      variant: 'destructive',
      disabled: ['received', 'cancelled'].includes(order.status),
    },
  ];

  // Column definitions for DataTable - SONG ÁNH 1:1 với Form
  const columns: Column<PurchaseOrder>[] = useMemo(() => [
    // ===== HEADER INFO SECTION =====
    {
      key: 'poNumber',
      header: 'Số PO',
      width: '120px',
      sortable: true,
      sticky: 'left',
      render: (value, row) => (
        <Link href={`/purchasing/${row.id}`} className="font-mono font-medium text-primary hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'supplier',
      header: 'Nhà cung cấp',
      width: '180px',
      sortable: true,
      render: (value) => value ? (
        <div>
          <span className="font-medium">{value.name}</span>
          <span className="text-xs text-muted-foreground ml-1">({value.code})</span>
        </div>
      ) : '-',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '110px',
      align: 'center',
      sortable: true,
      render: (value) => <POStatusBadge status={value} />,
    },
    {
      key: 'orderDate',
      header: 'Ngày đặt',
      width: '100px',
      sortable: true,
      render: (value) => formatDateShort(value),
    },
    {
      key: 'expectedDate',
      header: 'Ngày dự kiến',
      width: '100px',
      sortable: true,
      render: (value) => formatDateShort(value),
    },
    {
      key: 'currency',
      header: 'Tiền tệ',
      width: '80px',
      align: 'center',
      hidden: true,
      render: (value) => value || 'USD',
    },

    // ===== LINE ITEMS SECTION =====
    {
      key: 'lines',
      header: 'Số dòng',
      width: '80px',
      align: 'center',
      render: (value) => (
        <span className="font-mono text-xs">{value?.length || 0} items</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Tổng tiền',
      width: '120px',
      align: 'right',
      type: 'currency',
      sortable: true,
      render: (value, row) => (
        <span className="font-mono font-medium">
          {row.currency === 'VND' ? '₫' : '$'}{(value || 0).toLocaleString()}
        </span>
      ),
    },

    // ===== NOTES SECTION =====
    {
      key: 'notes',
      header: 'Ghi chú',
      width: '200px',
      hidden: true,
      render: (value) => value ? (
        <span className="text-xs truncate" title={value}>{value}</span>
      ) : '-',
    },

    // ===== ACTIONS =====
    {
      key: 'actions',
      header: '',
      width: '50px',
      sticky: 'right',
      render: (_, row) => <ActionDropdown items={createPOActions(row)} />,
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          Đơn mua hàng (PO)
        </h1>
        <p className="text-muted-foreground">
          Quản lý đơn đặt hàng từ nhà cung cấp
        </p>
      </div>

      {/* Stats */}
      <StatsCards orders={orders} />

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm số PO, nhà cung cấp..."
            onAdd={handleAdd}
            onImport={handleImport}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
            onRefresh={() => fetchOrders(search, filters.status)}
            addPermission="purchasing:create"
            deletePermission="orders:delete"
            addLabel="Tạo PO"
            selectedCount={selectedIds.size}
            isLoading={loading}
            filters={[
              {
                key: 'status',
                label: 'Trạng thái',
                options: [
                  { value: 'draft', label: 'Nháp' },
                  { value: 'pending', label: 'Chờ xử lý' },
                  { value: 'confirmed', label: 'Đã xác nhận' },
                  { value: 'in_progress', label: 'Đang thực hiện' },
                  { value: 'received', label: 'Đã nhận' },
                  { value: 'cancelled', label: 'Đã hủy' },
                ],
              },
            ]}
            activeFilters={filters}
            onFilterChange={(key, value) =>
              setFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClearFilters={() => setFilters({ status: 'all' })}
          />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={orders}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="Chưa có PO nào"
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            pagination
            pageSize={20}
            searchable={false}
            stickyHeader
            columnToggle
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'Purchase Orders',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PurchaseOrderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editingOrder}
        initialData={initialFormData}
        onSuccess={handleFormSuccess}
      />

      <DeletePurchaseOrderDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        order={deletingOrder}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

export default PurchaseOrdersTable;
