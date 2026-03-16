'use client';

import React, { useState, useMemo } from 'react';
import { Users, Mail, Eye, Edit2, Trash2, Phone, MapPin, CreditCard, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown } from '@/components/ui/action-dropdown';
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog';
import { DeleteCustomerDialog, Customer } from '@/components/forms/customer-form';
import { useDataExport } from '@/hooks/use-data-export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EntityTooltip } from '@/components/entity-tooltip';
import { useLanguage } from '@/lib/i18n/language-context';
import { DataTable, Column } from '@/components/ui-v2/data-table';
import { useApiData } from '@/hooks/use-api-data';
import { CompactStatsBar } from '@/components/ui/compact-stats-bar';

// =============================================================================
// STATS
// =============================================================================

function StatsCards({ customers }: { customers: Customer[] }) {
  const { t } = useLanguage();
  const active = customers.filter((c) => c.status === 'active').length;
  const enterprise = customers.filter((c) => c.type === 'Enterprise').length;
  const totalCredit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{customers.length}</div>
          <p className="text-xs text-muted-foreground">{t('customers.totalCustomers')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{active}</div>
          <p className="text-xs text-muted-foreground">{t('customers.activeCount')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-blue-600">{enterprise}</div>
          <p className="text-xs text-muted-foreground">{t('customers.enterprise')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">${(totalCredit / 1000).toFixed(0)}K</div>
          <p className="text-xs text-muted-foreground">{t('customers.totalCreditLimit')}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface CustomersTableProps {
  initialData?: Customer[];
}

export function CustomersTable({ initialData = [] }: CustomersTableProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', type: 'all' });

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // SWR-based data fetching with debounced search
  const { data: customers, loading, refresh } = useApiData<Customer>(
    '/api/customers',
    { search, status: filters.status, type: filters.type },
    { debounce: search ? 300 : 0 }
  );

  // Compact stats for bar
  const customerStats = useMemo(() => {
    const active = customers.filter((c) => c.status === 'active').length;
    const enterprise = customers.filter((c) => c.type === 'Enterprise').length;
    const totalCredit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    return [
      { label: t('customers.totalCustomers'), value: customers.length },
      { label: t('customers.activeCount'), value: active, color: 'text-green-600' },
      { label: t('customers.enterprise'), value: enterprise, color: 'text-blue-600' },
      { label: t('customers.totalCreditLimit'), value: `$${(totalCredit / 1000).toFixed(0)}K` },
    ];
  }, [customers, t]);

  const handleAdd = () => { setEditingCustomer(null); setFormOpen(true); };
  const handleEdit = (customer: Customer) => { setEditingCustomer(customer); setFormOpen(true); };
  const handleDelete = (customer: Customer) => { setDeletingCustomer(customer); setDeleteOpen(true); };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('table.bulkDeleteConfirm', { count: String(selectedIds.size), itemType: t('customers.pageTitle') }))) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/customers/${id}`, { method: 'DELETE' })));
      toast.success(t('table.bulkDeleteSuccess', { count: String(selectedIds.size), itemType: t('customers.pageTitle') }));
      refresh();
      setSelectedIds(new Set());
    } catch { toast.error(t('table.deleteError')); }
  };

  const { exportToExcel } = useDataExport();

  const handleExport = () => {
    if (!customers || customers.length === 0) {
      toast.warning(t('table.noDataToExport'));
      return;
    }

    exportToExcel(customers, {
      fileName: 'Customers_List',
      sheetName: 'Customers'
    });

    toast.success(t('success.exported'));
  };

  const handleImport = () => {
    toast.info(t('table.importInDev'));
  };

  // Column definitions for DataTable - SONG ÁNH 1:1 với Form
  const columns: Column<Customer>[] = useMemo(() => [
    // ===== BASIC INFO SECTION =====
    {
      key: 'code',
      header: t('customers.code'),
      width: '100px',
      sortable: true,
      sticky: 'left',
      render: (value, row) => (
        <EntityTooltip type="customer" id={row.id}>
          <span className="font-mono font-medium cursor-help">{value}</span>
        </EntityTooltip>
      ),
    },
    {
      key: 'name',
      header: t('customers.customerName'),
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
      key: 'type',
      header: t('customers.type'),
      width: '110px',
      sortable: true,
      cellClassName: (value) => value ? 'bg-slate-50 dark:bg-slate-900/30' : '',
      render: (value) => value || '-',
    },
    {
      key: 'country',
      header: t('column.country'),
      width: '100px',
      sortable: true,
      hidden: true,
      render: (value) => value || '-',
    },

    // ===== CONTACT INFO SECTION =====
    {
      key: 'contactName',
      header: t('column.contactName'),
      width: '150px',
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
      render: (value) => value ? (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline text-xs">
          {value}
        </a>
      ) : '-',
    },
    {
      key: 'billingAddress',
      header: t('column.billingAddress'),
      width: '200px',
      hidden: true,
      render: (value) => value ? (
        <span className="text-xs truncate" title={value}>{value}</span>
      ) : '-',
    },

    // ===== FINANCE SECTION =====
    {
      key: 'paymentTerms',
      header: t('column.paymentTerms'),
      width: '110px',
      sortable: true,
      hidden: true,
      cellClassName: (value) => value ? 'bg-slate-50 dark:bg-slate-900/30' : '',
      render: (value) => value || '-',
    },
    {
      key: 'creditLimit',
      header: t('column.creditLimit'),
      width: '120px',
      type: 'currency',
      sortable: true,
      render: (value) => value ? (
        <span className="font-mono text-xs font-medium">${value.toLocaleString()}</span>
      ) : '-',
    },

    // ===== ACTIONS =====
    {
      key: 'actions',
      header: '',
      width: '50px',
      sticky: 'right',
      render: (_, row) => (
        <ActionDropdown
          items={[
            { label: t('table.viewDetails'), icon: Eye, href: `/customers/${row.id}` },
            { label: t('common.edit'), icon: Edit2, onClick: () => handleEdit(row), permission: 'orders:edit' },
            { label: t('common.delete'), icon: Trash2, onClick: () => handleDelete(row), variant: 'destructive', permission: 'orders:delete' },
          ]}
        />
      ),
    },
  ], [t]);

  return (
    <div className="space-y-2">
      {/* Header - COMPACT */}
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {t('customers.pageTitle')}
        </h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">{t('customers.pageDesc')}</p>
      </div>

      {/* Stats - CompactStatsBar */}
      <CompactStatsBar stats={customerStats} />

      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2 shrink-0">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('customers.searchPlaceholder')}
            onAdd={handleAdd}
            onBulkDelete={handleBulkDelete}
            onRefresh={refresh}
            onExport={handleExport}
            onImport={handleImport}
            addPermission="orders:create"
            deletePermission="orders:delete"
            addLabel={t('customers.addCustomer')}
            selectedCount={selectedIds.size}
            isLoading={loading}
            filters={[
              {
                key: 'status',
                label: t('column.status'),
                options: [
                  { value: 'active', label: t('status.active') },
                  { value: 'inactive', label: t('status.inactive') },
                ],
              },
              {
                key: 'type',
                label: t('customers.typeFilter'),
                options: [
                  { value: 'Enterprise', label: 'Enterprise' },
                  { value: 'Government', label: 'Government' },
                  { value: 'SMB', label: 'SMB' },
                  { value: 'Distributor', label: 'Distributor' },
                ],
              },
            ]}
            activeFilters={filters}
            onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
            onClearFilters={() => setFilters({ status: 'all', type: 'all' })}
          />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={customers}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage={t('customers.emptyMessage')}
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
              sheetName: 'Customers',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} onSuccess={refresh} />
      <DeleteCustomerDialog open={deleteOpen} onOpenChange={setDeleteOpen} customer={deletingCustomer} onSuccess={refresh} />
    </div>
  );
}

export default CustomersTable;
