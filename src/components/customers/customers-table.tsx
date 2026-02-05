'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Mail, Eye, Edit2, Trash2, Phone, MapPin, CreditCard, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown } from '@/components/ui/action-dropdown';
import { CustomerFormDialog } from '@/components/customers/customer-form-dialog';
import { DeleteCustomerDialog, Customer } from '@/components/forms/customer-form';
import { useDataExport } from '@/hooks/use-data-export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DataTable, Column } from '@/components/ui-v2/data-table';

// =============================================================================
// STATS
// =============================================================================

function StatsCards({ customers }: { customers: Customer[] }) {
  const active = customers.filter((c) => c.status === 'active').length;
  const enterprise = customers.filter((c) => c.type === 'Enterprise').length;
  const totalCredit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{customers.length}</div>
          <p className="text-xs text-muted-foreground">Tổng khách hàng</p>
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
          <div className="text-2xl font-bold text-blue-600">{enterprise}</div>
          <p className="text-xs text-muted-foreground">Doanh nghiệp</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">${(totalCredit / 1000).toFixed(0)}K</div>
          <p className="text-xs text-muted-foreground">Tổng hạn mức</p>
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
  const [customers, setCustomers] = useState<Customer[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'all', type: 'all' });

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async (searchTerm?: string, statusFilter?: string, typeFilter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);

      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();
      if (response.ok) setCustomers(result.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount and when search/filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCustomers(search, filters.status, filters.type);
    }, search ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [search, filters.status, filters.type, fetchCustomers]);

  const handleAdd = () => { setEditingCustomer(null); setFormOpen(true); };
  const handleEdit = (customer: Customer) => { setEditingCustomer(customer); setFormOpen(true); };
  const handleDelete = (customer: Customer) => { setDeletingCustomer(customer); setDeleteOpen(true); };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} khách hàng?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/customers/${id}`, { method: 'DELETE' })));
      toast.success(`Đã xóa ${selectedIds.size} khách hàng`);
      fetchCustomers(search, filters.status, filters.type);
      setSelectedIds(new Set());
    } catch { toast.error('Có lỗi xảy ra khi xóa'); }
  };

  const { exportToExcel } = useDataExport();

  const handleExport = () => {
    if (!customers || customers.length === 0) {
      toast.warning('Không có dữ liệu để export');
      return;
    }

    exportToExcel(customers, {
      fileName: 'Customers_List',
      sheetName: 'Customers'
    });

    toast.success('Đã xuất file Excel');
  };

  const handleImport = () => {
    toast.info('Tính năng import đang được phát triển');
  };

  // Column definitions for DataTable - SONG ÁNH 1:1 với Form
  const columns: Column<Customer>[] = useMemo(() => [
    // ===== BASIC INFO SECTION =====
    {
      key: 'code',
      header: 'Mã KH',
      width: '100px',
      sortable: true,
      sticky: 'left',
      render: (value) => <span className="font-mono font-medium">{value}</span>,
    },
    {
      key: 'name',
      header: 'Tên khách hàng',
      width: '200px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
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
            value === 'inactive' && 'bg-gray-100 text-gray-600',
            value === 'pending' && 'bg-yellow-100 text-yellow-700',
            'text-[10px] px-1 py-0'
          )}
        >
          {value === 'active' ? 'Hoạt động' : value === 'inactive' ? 'Ngưng' : 'Chờ duyệt'}
        </Badge>
      ),
    },
    {
      key: 'type',
      header: 'Loại KH',
      width: '110px',
      sortable: true,
      render: (value) => value ? (
        <Badge variant="secondary" className="text-[10px] px-1 py-0">
          {value}
        </Badge>
      ) : '-',
    },
    {
      key: 'country',
      header: 'Quốc gia',
      width: '100px',
      sortable: true,
      hidden: true,
      render: (value) => value || '-',
    },

    // ===== CONTACT INFO SECTION =====
    {
      key: 'contactName',
      header: 'Người liên hệ',
      width: '150px',
      render: (value) => value || '-',
    },
    {
      key: 'contactPhone',
      header: 'Số điện thoại',
      width: '120px',
      hidden: true,
      render: (value) => value ? (
        <span className="font-mono text-xs">{value}</span>
      ) : '-',
    },
    {
      key: 'contactEmail',
      header: 'Email',
      width: '180px',
      render: (value) => value ? (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline text-xs">
          {value}
        </a>
      ) : '-',
    },
    {
      key: 'billingAddress',
      header: 'Địa chỉ thanh toán',
      width: '200px',
      hidden: true,
      render: (value) => value ? (
        <span className="text-xs truncate" title={value}>{value}</span>
      ) : '-',
    },

    // ===== FINANCE SECTION =====
    {
      key: 'paymentTerms',
      header: 'Điều khoản TT',
      width: '110px',
      sortable: true,
      hidden: true,
      render: (value) => value ? (
        <Badge variant="outline" className="text-[10px] px-1 py-0">
          {value}
        </Badge>
      ) : '-',
    },
    {
      key: 'creditLimit',
      header: 'Hạn mức (USD)',
      width: '120px',
      align: 'right',
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
            { label: 'Xem chi tiết', icon: Eye, href: `/customers/${row.id}` },
            { label: 'Chỉnh sửa', icon: Edit2, onClick: () => handleEdit(row), permission: 'orders:edit' },
            { label: 'Xóa', icon: Trash2, onClick: () => handleDelete(row), variant: 'destructive', permission: 'orders:delete' },
          ]}
        />
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Quản lý Khách hàng
        </h1>
        <p className="text-muted-foreground">Quản lý danh sách khách hàng và thông tin liên hệ</p>
      </div>

      <StatsCards customers={customers} />

      <Card>
        <CardHeader className="pb-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm khách hàng..."
            onAdd={handleAdd}
            onBulkDelete={handleBulkDelete}
            onRefresh={() => fetchCustomers(search, filters.status, filters.type)}
            onExport={handleExport}
            onImport={handleImport}
            addPermission="orders:create"
            deletePermission="orders:delete"
            addLabel="Thêm khách hàng"
            selectedCount={selectedIds.size}
            isLoading={loading}
            filters={[
              {
                key: 'status',
                label: 'Trạng thái',
                options: [
                  { value: 'active', label: 'Hoạt động' },
                  { value: 'inactive', label: 'Ngưng' },
                ],
              },
              {
                key: 'type',
                label: 'Loại',
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
            emptyMessage="Chưa có khách hàng nào"
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

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} onSuccess={() => fetchCustomers(search, filters.status, filters.type)} />
      <DeleteCustomerDialog open={deleteOpen} onOpenChange={setDeleteOpen} customer={deletingCustomer} onSuccess={() => fetchCustomers(search, filters.status, filters.type)} />
    </div>
  );
}

export default CustomersTable;
