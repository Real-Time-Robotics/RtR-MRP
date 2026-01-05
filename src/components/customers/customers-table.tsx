'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Mail, Phone, CreditCard } from 'lucide-react';
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
import { ActionDropdown } from '@/components/ui/action-dropdown';
import { CustomerForm, DeleteCustomerDialog, Customer } from '@/components/forms/customer-form';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Eye, Edit2, Trash2 } from 'lucide-react';

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

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.type !== 'all') params.set('type', filters.type);

      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();
      if (response.ok) setCustomers(result.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleAdd = () => { setEditingCustomer(null); setFormOpen(true); };
  const handleEdit = (customer: Customer) => { setEditingCustomer(customer); setFormOpen(true); };
  const handleDelete = (customer: Customer) => { setDeletingCustomer(customer); setDeleteOpen(true); };

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(customers.map((c) => c.id)));
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} khách hàng?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/customers/${id}`, { method: 'DELETE' })));
      toast.success(`Đã xóa ${selectedIds.size} khách hàng`);
      fetchCustomers();
      setSelectedIds(new Set());
    } catch { toast.error('Có lỗi xảy ra khi xóa'); }
  };

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
            onRefresh={fetchCustomers}
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={customers.length > 0 && selectedIds.size === customers.length} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Tên khách hàng</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Liên hệ</TableHead>
                <TableHead className="text-right">Hạn mức</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Chưa có khách hàng nào
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} className={cn(selectedIds.has(customer.id) && 'bg-muted/50')}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(customer.id)} onCheckedChange={() => toggleSelect(customer.id)} />
                    </TableCell>
                    <TableCell className="font-mono font-medium">{customer.code}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.type || 'Other'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.contactName && (
                          <div className="text-sm">{customer.contactName}</div>
                        )}
                        {customer.contactEmail && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.contactEmail}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {customer.creditLimit ? (
                        <span className="font-medium">${customer.creditLimit.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={customer.status === 'active' ? 'default' : 'secondary'}
                        className={cn(customer.status === 'active' && 'bg-green-100 text-green-700')}
                      >
                        {customer.status === 'active' ? 'Hoạt động' : 'Ngưng'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ActionDropdown
                        items={[
                          { label: 'Xem chi tiết', icon: Eye, href: `/customers/${customer.id}` },
                          { label: 'Chỉnh sửa', icon: Edit2, onClick: () => handleEdit(customer), permission: 'orders:edit' },
                          { label: 'Xóa', icon: Trash2, onClick: () => handleDelete(customer), variant: 'destructive', permission: 'orders:delete' },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CustomerForm open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} onSuccess={fetchCustomers} />
      <DeleteCustomerDialog open={deleteOpen} onOpenChange={setDeleteOpen} customer={deletingCustomer} onSuccess={fetchCustomers} />
    </div>
  );
}

export default CustomersTable;
