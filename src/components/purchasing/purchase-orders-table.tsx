'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Truck, DollarSign, FileText, Calendar, Package } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { PurchaseOrderForm, DeletePurchaseOrderDialog, PurchaseOrder } from '@/components/forms/purchase-order-form';
import { POStatusBadge } from '@/components/purchasing/po-status-badge';
import { toast } from 'sonner';
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
  const { t } = useLanguage();
  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = orders.filter((o) => !['received', 'cancelled'].includes(o.status));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{orders.length}</div>
          <p className="text-xs text-muted-foreground">{t('po.totalPO')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground">{t('po.totalValue')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-amber-600">{pendingOrders.length}</div>
          <p className="text-xs text-muted-foreground">{t('po.processing')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-blue-600">
            {orders.filter((o) => o.status === 'received').length}
          </div>
          <p className="text-xs text-muted-foreground">{t('po.received')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// DEEP LINK HANDLER (uses useSearchParams, must be inside Suspense)
// =============================================================================

interface DeepLinkHandlerProps {
  formOpen: boolean;
  onDeepLink: (data: { supplierId: string; lines: { partId: string; quantity: number; unitPrice: number }[]; notes: string }) => void;
}

function DeepLinkHandler({ formOpen, onDeepLink }: DeepLinkHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

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

      onDeepLink({
        supplierId: supplierId || '',
        lines: initialLines,
        notes: notes || '',
      });

      // Clear params to avoid loop / dirty URL
      router.replace('/purchasing');
    }
  }, [searchParams, formOpen, router, onDeepLink]);

  return null;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PurchaseOrdersTable({ initialData = [] }: PurchaseOrdersTableProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [initialFormData, setInitialFormData] = useState<Record<string, unknown> | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);

  // Deep link callback (from URL params like ?action=create&partId=...)
  const handleDeepLink = React.useCallback((data: { supplierId: string; lines: { partId: string; quantity: number; unitPrice: number }[]; notes: string }) => {
    setEditingOrder(null);
    setInitialFormData(data);
    setFormOpen(true);
  }, []);

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'all',
  });

  // SWR-based data fetching with debounced search
  const { data: orders, loading, refresh } = useApiData<PurchaseOrder>(
    '/api/purchase-orders',
    { search, status: filters.status },
    { debounce: search ? 300 : 0 }
  );

  // Compact stats for bar
  const poStats = useMemo(() => {
    const totalValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingOrders = orders.filter((o) => !['received', 'cancelled'].includes(o.status));
    return [
      { label: t('po.totalPO'), value: orders.length },
      { label: t('po.totalValue'), value: formatCurrency(totalValue), color: 'text-green-600' },
      { label: t('po.processing'), value: pendingOrders.length, color: 'text-amber-600' },
      { label: t('po.received'), value: orders.filter((o) => o.status === 'received').length, color: 'text-blue-600' },
    ];
  }, [orders, t]);

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
    refresh();
  };

  const handleDeleteSuccess = () => {
    refresh();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(t('table.bulkDeleteConfirm', { count: String(selectedIds.size), itemType: 'PO' }))) {
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
        toast.error(t('table.bulkDeleteError', { count: String(failedCount), itemType: 'PO' }));
      } else {
        toast.success(t('table.bulkDeleteSuccess', { count: String(selectedIds.size), itemType: 'PO' }));
      }

      refresh();
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(t('table.deleteError'));
    }
  };

  const handleExport = () => {
    if (orders.length === 0) {
      toast.info(t('table.noDataToExport'));
      return;
    }

    const exportColumns: ExportColumn<PurchaseOrder>[] = [
      { key: 'poNumber', header: 'PO Number', width: 12 },
      { key: 'supplier', header: 'Supplier', width: 25, format: (v) => (v as { name?: string })?.name || '-' },
      { key: 'orderDate', header: 'Order Date', width: 12, type: 'date' },
      { key: 'expectedDate', header: 'Expected Date', width: 12, type: 'date' },
      { key: 'linesCount', header: 'Items', width: 8, type: 'number', align: 'center', format: (_, row) => String(row.lines?.length || 0) },
      { key: 'totalAmount', header: 'Total Amount', width: 15, type: 'currency', align: 'right' },
      { key: 'status', header: 'Status', width: 12, format: (v) => (v as string)?.replace('_', ' ').toUpperCase() || '-' },
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

    toast.success(t('success.exported'));
  };

  const handleImport = () => {
    toast.info(t('table.importInDev'));
  };

  // Create action items for each row
  const createPOActions = (order: PurchaseOrder): ActionDropdownItem[] => [
    {
      label: t('table.viewDetails'),
      href: `/purchasing/${order.id}`,
    },
    {
      label: t('common.edit'),
      onClick: () => handleEdit(order),
      permission: 'orders:edit',
      disabled: ['received', 'cancelled'].includes(order.status),
    },
    {
      label: order.status === 'draft' ? t('common.delete') : t('po.cancelPO'),
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
      header: t('po.poNumber'),
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
      header: t('po.supplier'),
      width: '180px',
      sortable: true,
      render: (value) => value ? (
        <EntityTooltip type="supplier" id={value.id}>
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
          pending: 'bg-blue-100 dark:bg-blue-900/30',
          confirmed: 'bg-green-100 dark:bg-green-900/30',
          in_progress: 'bg-amber-100 dark:bg-amber-900/30',
          received: 'bg-emerald-100 dark:bg-emerald-900/30',
          cancelled: 'bg-red-100 dark:bg-red-900/30',
        };
        return map[value] || '';
      },
      render: (value) => {
        const labels: Record<string, string> = {
          draft: t('status.draft'), pending: t('status.pending'), confirmed: t('status.confirmed'),
          in_progress: t('status.inProgress'), received: t('status.received'), cancelled: t('status.cancelled'),
        };
        return <span className="text-xs font-medium">{labels[value] || value}</span>;
      },
    },
    {
      key: 'orderDate',
      header: t('po.orderDate'),
      width: '100px',
      sortable: true,
      render: (value) => formatDateShort(value),
    },
    {
      key: 'expectedDate',
      header: t('po.expectedDate'),
      width: '100px',
      sortable: true,
      render: (value) => formatDateShort(value),
    },
    {
      key: 'currency',
      header: t('po.currency'),
      width: '80px',
      hidden: true,
      render: (value) => value || 'USD',
    },

    // ===== LINE ITEMS SECTION =====
    {
      key: 'lines',
      header: t('po.lineCount'),
      width: '80px',
      render: (value) => (
        <span className="font-mono text-xs">{value?.length || 0} items</span>
      ),
    },
    {
      key: 'totalAmount',
      header: t('column.totalAmount'),
      width: '120px',
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
      header: t('column.notes'),
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
  ], [t]);

  return (
    <div className="space-y-2">
      {/* Deep link handler for URL params (e.g., from AI Copilot) */}
      <Suspense fallback={null}>
        <DeepLinkHandler formOpen={formOpen} onDeepLink={handleDeepLink} />
      </Suspense>

      {/* Header - COMPACT */}
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
          <Truck className="h-4 w-4" />
          {t('po.pageTitle')}
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
          {t('po.pageDesc')}
        </p>
      </div>

      {/* Stats - CompactStatsBar */}
      <CompactStatsBar stats={poStats} />

      {/* Table Card - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2 shrink-0">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('po.searchPlaceholder')}
            onAdd={handleAdd}
            onImport={handleImport}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
            onRefresh={refresh}
            addPermission="purchasing:create"
            deletePermission="orders:delete"
            addLabel={t('po.createPO')}
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
                  { value: 'received', label: t('status.received') },
                  { value: 'cancelled', label: t('status.cancelled') },
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
            emptyMessage={t('po.emptyMessage')}
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
