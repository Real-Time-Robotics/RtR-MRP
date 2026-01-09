'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { PurchaseOrderForm, DeletePurchaseOrderDialog, PurchaseOrder } from '@/components/forms/purchase-order-form';
import { POStatusBadge } from '@/components/purchasing/po-status-badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DataTable, Column } from '@/components/ui-v2/data-table';

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
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.status !== 'all') params.set('status', filters.status);

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
  }, [search, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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
    fetchOrders();
  };

  const handleDeleteSuccess = () => {
    fetchOrders();
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

      fetchOrders();
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleExport = () => {
    toast.info('Tính năng export đang được phát triển');
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

  // Column definitions for DataTable
  const columns: Column<PurchaseOrder>[] = useMemo(() => [
    {
      key: 'poNumber',
      header: 'PO #',
      width: '120px',
      sortable: true,
      render: (value, row) => (
        <Link href={`/purchasing/${row.id}`} className="font-mono font-medium text-primary hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'supplier',
      header: 'Nhà cung cấp',
      width: '150px',
      sortable: true,
      render: (value) => value?.name || '-',
    },
    {
      key: 'orderDate',
      header: 'Ngày đặt',
      width: '100px',
      sortable: true,
      render: (value) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'expectedDate',
      header: 'Ngày dự kiến',
      width: '100px',
      sortable: true,
      render: (value) => format(new Date(value), 'dd/MM/yyyy'),
    },
    {
      key: 'lines',
      header: 'Items',
      width: '70px',
      align: 'center',
      render: (value) => value?.length || 0,
    },
    {
      key: 'totalAmount',
      header: 'Giá trị',
      width: '100px',
      align: 'right',
      type: 'currency',
      sortable: true,
      render: (value) => formatCurrency(value || 0),
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
      key: 'actions',
      header: '',
      width: '50px',
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
            onRefresh={fetchOrders}
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
                  { value: 'draft', label: 'Draft' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'received', label: 'Received' },
                  { value: 'cancelled', label: 'Cancelled' },
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
