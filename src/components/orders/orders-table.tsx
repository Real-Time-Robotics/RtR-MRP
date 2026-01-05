'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { SalesOrderForm, DeleteSalesOrderDialog, SalesOrder } from '@/components/forms/sales-order-form';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{orders.length}</div>
          <p className="text-xs text-muted-foreground">Tổng đơn hàng</p>
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
          <div className="text-2xl font-bold text-blue-600">
            {orders.filter((o) => o.status === 'in_progress').length}
          </div>
          <p className="text-xs text-muted-foreground">Đang sản xuất</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-amber-600">
            {orders.filter((o) => o.status === 'pending').length}
          </div>
          <p className="text-xs text-muted-foreground">Chờ xử lý</p>
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
    toast.info('Tính năng export đang được phát triển');
  };

  const handleImport = () => {
    toast.info('Tính năng import đang được phát triển');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
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
    { type: 'separator' },
    {
      label: order.status === 'draft' ? 'Xóa' : 'Hủy đơn',
      onClick: () => handleDelete(order),
      permission: 'orders:delete',
      variant: 'destructive',
      disabled: ['completed', 'cancelled'].includes(order.status),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Đơn hàng bán
        </h1>
        <p className="text-muted-foreground">
          Quản lý đơn đặt hàng từ khách hàng
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
                  { value: 'draft', label: 'Draft' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ],
              },
              {
                key: 'priority',
                label: 'Ưu tiên',
                options: [
                  { value: 'low', label: 'Low' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={orders.length > 0 && selectedIds.size === orders.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Ngày đặt</TableHead>
                <TableHead>Ngày yêu cầu</TableHead>
                <TableHead>Ưu tiên</TableHead>
                <TableHead className="text-right">Giá trị</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">Chưa có đơn hàng nào</p>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className={cn(selectedIds.has(order.id) && 'bg-muted/50')}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(order.id)}
                        onCheckedChange={() => toggleSelect(order.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/orders/${order.id}`}
                        className="hover:underline text-primary"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customer?.name || '-'}</TableCell>
                    <TableCell>{format(new Date(order.orderDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{format(new Date(order.requiredDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'capitalize',
                          order.priority === 'urgent' && 'text-red-600 font-medium',
                          order.priority === 'high' && 'text-amber-600'
                        )}
                      >
                        {order.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(order.totalAmount || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <ActionDropdown items={createOrderActions(order)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
