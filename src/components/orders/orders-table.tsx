'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ShoppingCart, Calendar, FileText, Package } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { SalesOrderForm, DeleteSalesOrderDialog, SalesOrder } from '@/components/forms/sales-order-form';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import { formatDateShort } from '@/lib/date';
import { DataTable, Column } from '@/components/ui-v2/data-table';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/export';
import { formatCurrency as formatCurrencyUtil } from '@/lib/currency';
import { useApiData } from '@/hooks/use-api-data';
import { CompactStatsBar } from '@/components/ui/compact-stats-bar';
import { EntityTooltip } from '@/components/entity-tooltip';

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
// MAIN COMPONENT
// =============================================================================

export function OrdersTable({ initialData = [] }: OrdersTableProps) {
  const { t } = useLanguage();
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

  // SWR-based data fetching with debounced search
  const { data: orders, loading, refresh } = useApiData<SalesOrder>(
    '/api/sales-orders',
    { search, status: filters.status, priority: filters.priority },
    { debounce: search ? 300 : 0 }
  );

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
    refresh();
  };

  const handleDeleteSuccess = () => {
    refresh();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(t('table.bulkDeleteConfirm', { count: String(selectedIds.size), itemType: t('orders.title').toLowerCase() }))) {
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
        toast.error(t('table.bulkDeleteError', { count: String(failedCount), itemType: t('orders.title').toLowerCase() }));
      } else {
        toast.success(t('table.bulkDeleteSuccess', { count: String(selectedIds.size), itemType: t('orders.title').toLowerCase() }));
      }

      refresh();
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(t('error.occurred'));
    }
  };

  const handleExport = () => {
    if (orders.length === 0) {
      toast.info(t('table.noDataToExport'));
      return;
    }

    const exportColumns: ExportColumn<SalesOrder>[] = [
      { key: 'orderNumber', header: 'Order Number', width: 12 },
      { key: 'customer', header: 'Customer', width: 25, format: (v) => (v as { name?: string })?.name || '-' },
      { key: 'orderDate', header: 'Order Date', width: 12, type: 'date' },
      { key: 'requiredDate', header: 'Required Date', width: 12, type: 'date' },
      { key: 'priority', header: 'Priority', width: 10, format: (v) => { const s = v as string; return s ? s.charAt(0).toUpperCase() + s.slice(1) : '-'; } },
      { key: 'totalAmount', header: 'Total Amount', width: 15, type: 'currency', align: 'right' },
      { key: 'status', header: 'Status', width: 12, format: (v) => (v as string)?.replace('_', ' ').toUpperCase() || '-' },
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

    toast.success(t('success.exported'));
  };

  const handleImport = () => {
    toast.info(t('table.importInDev'));
  };

  // Create action items for each row
  const createOrderActions = (order: SalesOrder): ActionDropdownItem[] => [
    {
      label: t('table.viewDetails'),
      href: `/orders/${order.id}`,
    },
    {
      label: t('common.edit'),
      onClick: () => handleEdit(order),
      permission: 'orders:edit',
      disabled: !['draft', 'pending', 'confirmed'].includes(order.status),
    },
    {
      label: order.status === 'draft' ? t('common.delete') : t('orders.cancelOrder'),
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
      header: t('orders.orderNumber'),
      width: '120px',
      sortable: true,
      sticky: 'left',
      render: (value, row) => (
        <Link href={`/orders/${row.id}`} className="font-mono font-medium text-primary hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: t('orders.customer'),
      width: '180px',
      sortable: true,
      render: (value) => value ? (
        <EntityTooltip type="customer" id={value.id}>
          <div className="cursor-help">
            <span className="font-medium">{value.name}</span>
            <span className="text-xs text-muted-foreground ml-1">({value.code})</span>
          </div>
        </EntityTooltip>
      ) : '-',
    },
    {
      key: 'status',
      header: t('column.status'),
      width: '110px',
      sortable: true,
      cellClassName: (value) => {
        const map: Record<string, string> = {
          draft: 'bg-gray-100 dark:bg-gray-800',
          pending: 'bg-yellow-100 dark:bg-yellow-900/30',
          confirmed: 'bg-green-100 dark:bg-green-900/30',
          in_progress: 'bg-blue-100 dark:bg-blue-900/30',
          completed: 'bg-emerald-100 dark:bg-emerald-900/30',
          partially_shipped: 'bg-violet-100 dark:bg-violet-900/30',
          shipped: 'bg-indigo-100 dark:bg-indigo-900/30',
          delivered: 'bg-teal-100 dark:bg-teal-900/30',
          cancelled: 'bg-red-100 dark:bg-red-900/30',
        };
        return map[value] || '';
      },
      render: (value) => {
        const labels: Record<string, string> = {
          draft: t('status.draft'), pending: t('status.pending'), confirmed: t('status.confirmed'),
          in_progress: t('status.inProgress'), completed: t('status.completed'),
          partially_shipped: t('status.partiallyShipped'), shipped: t('status.shipped'),
          delivered: t('status.delivered'), cancelled: t('status.cancelled'),
        };
        return <span className="text-xs font-medium">{labels[value] || value}</span>;
      },
    },
    {
      key: 'orderDate',
      header: t('orders.orderDate'),
      width: '100px',
      sortable: true,
      render: (value) => formatDateShort(value),
    },
    {
      key: 'requiredDate',
      header: t('orders.requiredDateCol'),
      width: '100px',
      sortable: true,
      render: (value) => formatDateShort(value),
    },
    {
      key: 'promisedDate',
      header: t('orders.promisedDate'),
      width: '100px',
      sortable: true,
      hidden: true,
      render: (value) => value ? formatDateShort(value) : '-',
    },
    {
      key: 'priority',
      header: t('orders.priority'),
      width: '90px',
      sortable: true,
      cellClassName: (value) => {
        const map: Record<string, string> = {
          urgent: 'bg-red-100 dark:bg-red-900/30',
          high: 'bg-amber-100 dark:bg-amber-900/30',
          normal: 'bg-blue-50 dark:bg-blue-900/20',
          low: 'bg-gray-50 dark:bg-gray-800',
        };
        return map[value] || '';
      },
      render: (value) => {
        const labels: Record<string, string> = {
          urgent: t('priority.urgent'), high: t('priority.high'), normal: t('priority.normal'), low: t('priority.low'),
        };
        return <span className="text-xs font-medium">{labels[value] || value}</span>;
      },
    },
    {
      key: 'lines',
      header: t('orders.products'),
      width: '250px',
      render: (value, row) => {
        const lines = value as SalesOrder['lines'];
        const order = row as SalesOrder;
        const hasShipments = ['partially_shipped', 'shipped', 'delivered'].includes(order.status);
        if (!lines || lines.length === 0) {
          return <span className="text-xs text-muted-foreground">{t('orders.noProducts')}</span>;
        }
        return (
          <div className="space-y-0.5">
            {lines.slice(0, 3).map((line, idx) => {
              const shipped = line.shippedQty || 0;
              const fullyShipped = shipped >= line.quantity;
              const partiallyShipped = shipped > 0 && shipped < line.quantity;
              return (
                <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                  <span className={cn("truncate max-w-[140px]", fullyShipped && hasShipments && "text-green-700")} title={line.product?.name || line.productId}>
                    {line.product?.name || line.productId}
                  </span>
                  <span className="shrink-0 flex items-center gap-1">
                    {hasShipments ? (
                      <span className={cn(
                        "font-mono px-1 py-0.5 rounded text-[10px]",
                        fullyShipped ? "bg-green-100 text-green-700" :
                        partiallyShipped ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-500"
                      )}>
                        {shipped}/{line.quantity}
                      </span>
                    ) : (
                      <span className="font-mono text-muted-foreground">x{line.quantity}</span>
                    )}
                  </span>
                </div>
              );
            })}
            {lines.length > 3 && (
              <span className="text-[10px] text-muted-foreground">{t('orders.moreProducts', { count: String(lines.length - 3) })}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      header: t('column.totalAmount'),
      width: '120px',
      type: 'currency',
      sortable: true,
      render: (value) => (
        <span className="font-mono font-medium">${(value || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'notes',
      header: t('column.notes'),
      width: '200px',
      hidden: true,
      render: (value) => value ? (
        <span className="text-xs truncate" title={value}>{value}</span>
      ) : '-',
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      sticky: 'right',
      render: (_, row) => <ActionDropdown items={createOrderActions(row)} />,
    },
  ], [t]);

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Header - COMPACT */}
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          {t('orders.pageTitle')}
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
          {t('orders.pageDesc')}
        </p>
      </div>

      {/* Stats - CompactStatsBar */}
      <CompactStatsBar stats={(() => {
        const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        return [
          { label: t('orders.totalOrders'), value: orders.length },
          { label: t('orders.totalValue'), value: formatCurrency(totalValue), color: 'text-green-600' },
          { label: t('orders.inProduction'), value: orders.filter(o => o.status === 'in_progress').length, color: 'text-blue-600' },
          { label: t('orders.pendingCount'), value: orders.filter(o => o.status === 'pending').length, color: 'text-amber-600' },
        ];
      })()} />

      {/* Table Card - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="px-3 py-2 shrink-0">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('orders.searchPlaceholder')}
            onAdd={handleAdd}
            onImport={handleImport}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
            onRefresh={refresh}
            addPermission="orders:create"
            deletePermission="orders:delete"
            addLabel={t('orders.createOrder')}
            selectedCount={selectedIds.size}
            isLoading={loading}
            filters={[
              {
                key: 'status',
                label: t('column.status'),
                options: [
                  { value: 'draft', label: t('status.draft') },
                  { value: 'pending', label: t('status.pending') },
                  { value: 'confirmed', label: t('status.confirmed') },
                  { value: 'in_progress', label: t('status.inProgress') },
                  { value: 'completed', label: t('status.completed') },
                  { value: 'partially_shipped', label: t('status.partiallyShipped') },
                  { value: 'shipped', label: t('status.shipped') },
                  { value: 'delivered', label: t('status.delivered') },
                  { value: 'cancelled', label: t('status.cancelled') },
                ],
              },
              {
                key: 'priority',
                label: t('orders.priority'),
                options: [
                  { value: 'low', label: t('priority.low') },
                  { value: 'normal', label: t('priority.normal') },
                  { value: 'high', label: t('priority.high') },
                  { value: 'urgent', label: t('priority.urgent') },
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
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <DataTable
            data={orders}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage={t('orders.emptyMessage')}
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
            pagination
            pageSize={50}
            searchable={false}
            stickyHeader
            columnToggle
            virtualize
            virtualRowHeight={36}
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
