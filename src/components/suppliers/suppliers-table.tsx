'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Star, CheckCircle, XCircle, Building2, AlertTriangle, Shield, User, Mail, Phone, MapPin, CreditCard, Clock, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import { DeleteSupplierDialog, Supplier } from '@/components/forms/supplier-form';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, createSupplierActions } from '@/components/ui/action-dropdown';
import { useDataExport } from '@/hooks/use-data-export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EntityTooltip } from '@/components/entity-tooltip';
import { useLanguage } from '@/lib/i18n/language-context';
import { DataTable, Column } from '@/components/ui-v2/data-table';
import { useApiData } from '@/hooks/use-api-data';
import { CompactStatsBar } from '@/components/ui/compact-stats-bar';

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
// MAIN COMPONENT
// =============================================================================

export function SuppliersTable({ initialData = [] }: SuppliersTableProps) {
  const router = useRouter();
  const { t } = useLanguage();

  // State
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

  // SWR-based data fetching with debounced search
  const { data: suppliers, loading, refresh } = useApiData<Supplier>(
    '/api/suppliers',
    { search, status: filters.status },
    { debounce: search ? 300 : 0 }
  );

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
    refresh();
  };

  const handleDeleteSuccess = () => {
    refresh();
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(t('table.bulkDeleteConfirm', { count: String(selectedIds.size), itemType: t('suppliers.title').toLowerCase() }))) {
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
        toast.error(t('table.bulkDeleteError', { count: String(failedCount), itemType: t('suppliers.title').toLowerCase() }));
      } else {
        toast.success(t('table.bulkDeleteSuccess', { count: String(selectedIds.size), itemType: t('suppliers.title').toLowerCase() }));
      }

      refresh();
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(t('table.deleteError'));
    }
  };


  const { exportToExcel } = useDataExport();

  const handleExport = () => {
    if (!suppliers || suppliers.length === 0) {
      toast.warning(t('table.noDataToExport'));
      return;
    }

    exportToExcel(suppliers, {
      fileName: 'Suppliers_List',
      sheetName: 'Suppliers'
    });

    toast.success(t('success.exported'));
  };

  const handleImport = () => {
    toast.info(t('table.importInDev'));
  };

  // Get unique countries for filter
  const countries = Array.from(new Set(suppliers.map((s) => s.country))).sort();

  // Column definitions for DataTable - SONG ÁNH 1:1 với Form
  const columns: Column<Supplier>[] = useMemo(() => [
    // ===== BASIC INFO SECTION =====
    {
      key: 'code',
      header: t('suppliers.supplierCode'),
      width: '100px',
      sortable: true,
      sticky: 'left',
      render: (value, row) => (
        <EntityTooltip type="supplier" id={row.id}>
          <span className="font-mono font-medium cursor-help">{value}</span>
        </EntityTooltip>
      ),
    },
    {
      key: 'name',
      header: t('suppliers.supplierName'),
      width: '200px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'status',
      header: t('column.status'),
      width: '100px',
      sortable: true,
      cellClassName: (value) =>
        value === 'active'
          ? 'bg-green-50 dark:bg-green-950/30'
          : value === 'inactive'
            ? 'bg-gray-50 dark:bg-gray-900/30'
            : 'bg-yellow-50 dark:bg-yellow-950/30',
      render: (value) => (
        <span
          className={cn(
            'text-xs font-medium',
            value === 'active' && 'text-green-700 dark:text-green-400',
            value === 'inactive' && 'text-gray-600 dark:text-gray-400',
            value === 'pending' && 'text-yellow-700 dark:text-yellow-400',
          )}
        >
          {value === 'active' ? t('status.active') : value === 'inactive' ? t('status.inactive') : t('status.approval')}
        </span>
      ),
    },
    {
      key: 'country',
      header: t('column.country'),
      width: '100px',
      sortable: true,
    },
    {
      key: 'category',
      header: t('column.category'),
      width: '120px',
      sortable: true,
      hidden: true,
      render: (value) => value || '-',
    },

    // ===== CONTACT INFO SECTION =====
    {
      key: 'contactName',
      header: t('column.contactName'),
      width: '150px',
      hidden: true,
      render: (value) => value || '-',
    },
    {
      key: 'contactPhone',
      header: t('column.contactPhone'),
      width: '120px',
      hidden: true,
      render: (value) => value ? (
        <span className="font-mono text-xs">{value}</span>
      ) : '-',
    },
    {
      key: 'contactEmail',
      header: t('column.contactEmail'),
      width: '180px',
      hidden: true,
      render: (value) => value ? (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline text-xs">
          {value}
        </a>
      ) : '-',
    },
    {
      key: 'address',
      header: t('column.address'),
      width: '200px',
      hidden: true,
      render: (value) => value ? (
        <span className="text-xs truncate" title={value}>{value}</span>
      ) : '-',
    },

    // ===== BUSINESS TERMS SECTION =====
    {
      key: 'paymentTerms',
      header: t('column.paymentTerms'),
      width: '100px',
      sortable: true,
      hidden: true,
      cellClassName: (value) => value ? 'bg-slate-50 dark:bg-slate-900/30' : '',
      render: (value) => value || '-',
    },
    {
      key: 'leadTimeDays',
      header: 'Lead Time',
      width: '90px',
      sortable: true,
      render: (value) => (
        <span className="text-xs font-mono">{t('suppliers.leadTimeDays', { days: String(value) })}</span>
      ),
    },
    {
      key: 'rating',
      header: t('suppliers.ratingCol'),
      width: '100px',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'h-3 w-3',
                star <= (value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
              )}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'ndaaCompliant',
      header: 'NDAA',
      width: '70px',
      render: (value) => (
        value ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )
      ),
    },

    // ===== ACTIONS =====
    {
      key: 'actions',
      header: '',
      width: '50px',
      sticky: 'right',
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
  ], [t]);

  return (
    // COMPACT: space-y-6 → space-y-3
    <div className="space-y-2">
      {/* Header - COMPACT */}
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
          <Building2 className="h-4 w-4" />
          {t('suppliers.pageTitle')}
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">
          {t('suppliers.pageDesc')}
        </p>
      </div>

      {/* Stats - CompactStatsBar */}
      <CompactStatsBar stats={(() => {
        const active = suppliers.filter(s => s.status === 'active').length;
        const ndaaCompliant = suppliers.filter(s => s.ndaaCompliant).length;
        const avgLeadTime = suppliers.length > 0
          ? Math.round(suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / suppliers.length)
          : 0;
        return [
          { label: t('suppliers.totalSuppliers'), value: suppliers.length },
          { label: t('suppliers.activeCount'), value: active, color: 'text-green-600' },
          { label: t('suppliers.ndaaCompliantCount'), value: ndaaCompliant, color: 'text-blue-600' },
          { label: t('suppliers.avgLeadTimeLabel'), value: t('suppliers.leadTimeDays', { days: String(avgLeadTime) }) },
        ];
      })()} />

      {/* Table Card - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('suppliers.searchPlaceholder')}
            onAdd={handleAdd}
            onImport={handleImport}
            onExport={handleExport}
            onBulkDelete={handleBulkDelete}
            onRefresh={refresh}
            addPermission="orders:create"
            deletePermission="orders:delete"
            addLabel={t('suppliers.addSupplier')}
            selectedCount={selectedIds.size}
            isLoading={loading}
            filters={[
              {
                key: 'status',
                label: t('column.status'),
                options: [
                  { value: 'active', label: t('status.active') },
                  { value: 'inactive', label: t('status.inactive') },
                  { value: 'pending', label: t('status.approval') },
                ],
              },
              {
                key: 'country',
                label: t('column.country'),
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
            loading={loading}
            emptyMessage={t('suppliers.emptyMessage')}
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
