'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { SalesOrderForm, DeleteSalesOrderDialog, SalesOrder } from '@/components/forms/sales-order-form';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/date';
import { DataTable, Column } from '@/components/ui-v2/data-table';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/export';
import { formatCurrency as formatCurrencyUtil } from '@/lib/currency';

// =============================================================================
// TYPES
// =============================================================================

interface OrdersTableProps {
  initialData?: SalesOrder[];
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

function StatsCards({ orders }: { orders: SalesOrder[] }) {
  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    // COMPACT: gap-4 → gap-2
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <Card className="border-gray-200 dark:border-mrp-border">
        {/* COMPACT: pt-4 → p-3 */}
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono">{orders.length}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Tổng đơn hàng</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-green-600">{formatCurrency(totalValue)}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Tổng giá trị</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-blue-600">
            {orders.filter((o) => o.status === 'in_progress').length}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Đang sản xuất</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-amber-600">
            {orders.filter((o) => o.status === 'pending').length}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Chờ xử lý</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OrdersTable({ initialData = [] }: OrdersTableProps) {
  const [orders, setOrders] = useState<SalesOrder[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<SalesOrder | null>(null);

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'all',
    priority: 'all',
  });

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.priority !== 'all') params.set('priority', filters.priority);

      const response = await fetch(`/api/sales-orders?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setOrders(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Không thể tải danh sách đơn hàng');
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

  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    setFormOpen(true);
  };

  const handleDelete = (order: SalesOrder) => {
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

    if (!confirm(`Bạn có chắc chắn muốn xóa/hủy ${selectedIds.size} đơn hàng?`)) {
      return;
    }

    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/sales-orders/${id}`, { method: 'DELETE' })
        )
      );

      const failedCount = results.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        toast.error(`Không thể xóa/hủy ${failedCount} đơn hàng`);
      } else {
        toast.success(`Đã xóa/hủy ${selectedIds.size} đơn hàng`);
      }

      fetchOrders();
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
      { key: 'orderNumber', header: 'Order Number', width: 12 },
      { key: 'customer', header: 'Customer', width: 25, format: (v) => v?.name || '-' },
      { key: 'orderDate', header: 'Order Date', width: 12, type: 'date' },
      { key: 'requiredDate', header: 'Required Date', width: 12, type: 'date' },
      { key: 'priority', header: 'Priority', width: 10, format: (v) => v?.charAt(0).toUpperCase() + v?.slice(1) || '-' },
      { key: 'totalAmount', header: 'Total Amount', width: 15, type: 'currency', align: 'right' },
      { key: 'status', header: 'Status', width: 12, format: (v) => v?.replace('_', ' ').toUpperCase() || '-' },
    ];

    const totalValue = orders.reduce((sum, so) => sum + (so.totalAmount || 0), 0);

    exportToExcel(orders, exportColumns, {
      title: 'Sales Orders Report',
      filename: 'sales-orders',
      sheetName: 'Sales Orders',
    }, [
      ['Total Sales Orders', orders.length.toString()],
      ['Total Value', formatCurrencyUtil(totalValue)],
      ['In Progress', orders.filter(so => so.status === 'in_progress').length.toString()],
      ['Pending', orders.filter(so => so.status === 'pending').length.toString()],
    ]);

    toast.success('Đã xuất file Excel thành công');
  };

  const handleImport = () => {
    toast.info('Tính năng import đang được phát triển');
  };

  // Create action items for each row
  const createOrderActions = (order: SalesOrder): ActionDropdownItem[] => [
    {
      label: 'Xem chi tiết',
      href: `/orders/${order.id}`,
    },
    {
      label: 'Chỉnh sửa',
      onClick: () => handleEdit(order),
      permission: 'orders:edit',
      disabled: !['draft', 'pending', 'confirmed'].includes(order.status),
    },
    {
      label: order.status === 'draft' ? 'Xóa' : 'Hủy đơn',
      onClick: () => handleDelete(order),
      permission: 'orders:delete',
      variant: 'destructive',
      disabled: ['completed', 'cancelled'].includes(order.status),
    },
  ];

  // Column definitions for DataTable
  const columns: Column<SalesOrder>[] = useMemo(() => [
    {
      key: 'orderNumber',
      header: 'Order #',
      width: '120px',
      sortable: true,
      render: (value, row) => (
        <Link href={`/orders/${row.id}`} className="font-mono font-medium text-primary hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      width: '150px',
      sortable: true,
      render: (value) => value?.name || '-',
    },
    {
      key: 'orderDate',
      header: 'Ngày đặt',
      width: '100px',
      sortable: true,
      render: (value) => formatDateShort(value),
    },
    {
      key: 'requiredDate',
      header: 'Ngày yêu cầu',
      width: '100px',
      sortable: true,
      render: (value) => formatDateShort(value),
    },
    {
      key: 'priority',
      header: 'Ưu tiên',
      width: '80px',
      align: 'center',
      render: (value) => (
        <span className={cn(
          'capitalize text-xs',
          value === 'urgent' && 'text-red-600 font-medium',
          value === 'high' && 'text-amber-600'
        )}>
          {value}
        </span>
      ),
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
      render: (value) => <OrderStatusBadge status={value} />,
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (_, row) => <ActionDropdown items={createOrderActions(row)} />,
    },
  ], []);

  return (
    // COMPACT: space-y-6 → space-y-3
    <div className="space-y-3">
      {/* Header - COMPACT */}
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Đơn hàng bán
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
          Quản lý đơn đặt hàng từ khách hàng
        </p>
      </div>

      {/* Stats */}
      <StatsCards orders={orders} />

      {/* Table Card - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm số đơn, khách hàng..."
            onAdd={handleAdd}
            onImport={handleImport}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
            onRefresh={fetchOrders}
            addPermission="orders:create"
            deletePermission="orders:delete"
            addLabel="Tạo đơn hàng"
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
                  { value: 'completed', label: 'Hoàn thành' },
                  { value: 'cancelled', label: 'Đã hủy' },
                ],
              },
              {
                key: 'priority',
                label: 'Ưu tiên',
                options: [
                  { value: 'low', label: 'Thấp' },
                  { value: 'normal', label: 'Bình thường' },
                  { value: 'high', label: 'Cao' },
                  { value: 'urgent', label: 'Khẩn cấp' },
                ],
              },
            ]}
            activeFilters={filters}
            onFilterChange={(key, value) =>
              setFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClearFilters={() => setFilters({ status: 'all', priority: 'all' })}
          />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={orders}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="Chưa có đơn hàng nào"
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
              sheetName: 'Orders',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SalesOrderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editingOrder}
        onSuccess={handleFormSuccess}
      />

      <DeleteSalesOrderDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        order={deletingOrder}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

export default OrdersTable;
