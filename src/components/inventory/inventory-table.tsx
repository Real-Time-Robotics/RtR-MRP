'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, AlertTriangle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { ActionDropdown, ActionDropdownItem } from '@/components/ui/action-dropdown';
import { InventoryAdjustDialog } from '@/components/forms/inventory-adjust-dialog';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { PermissionButton } from '@/components/ui/permission-button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StockStatus } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface InventoryItem {
  partId: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  isCritical: boolean;
  minStockLevel: number;
  reorderPoint: number;
  quantity: number;
  reserved: number;
  available: number;
  status: StockStatus;
  warehouseId?: string;
  warehouseName?: string;
}

interface InventoryTableProps {
  initialData?: InventoryItem[];
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

function StatsCards({ inventory }: { inventory: InventoryItem[] }) {
  const criticalCount = inventory.filter(
    (i) => i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK'
  ).length;
  const reorderCount = inventory.filter((i) => i.status === 'REORDER').length;
  const okCount = inventory.filter((i) => i.status === 'OK').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{inventory.length}</div>
          <p className="text-xs text-muted-foreground">Tổng SKU</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <p className="text-xs text-muted-foreground">Critical / Hết hàng</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-amber-600">{reorderCount}</div>
          <p className="text-xs text-muted-foreground">Cần đặt hàng</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{okCount}</div>
          <p className="text-xs text-muted-foreground">Đủ hàng</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InventoryTable({ initialData = [] }: InventoryTableProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Dialog state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);

  // Filters
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'all',
    category: 'all',
  });

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory');
      const result = await response.json();

      if (response.ok) {
        // Transform data to match our interface
        const items: InventoryItem[] = (result.data || result || []).map((item: any) => ({
          partId: item.partId || item.id,
          partNumber: item.partNumber || item.part?.partNumber,
          name: item.name || item.part?.name,
          category: item.category || item.part?.category,
          unit: item.unit || item.part?.unit,
          unitCost: item.unitCost || item.part?.unitCost || 0,
          isCritical: item.isCritical || item.part?.isCritical || false,
          minStockLevel: item.minStockLevel || item.part?.minStockLevel || 0,
          reorderPoint: item.reorderPoint || item.part?.reorderPoint || 0,
          quantity: item.quantity || 0,
          reserved: item.reserved || item.reservedQty || 0,
          available: item.available || (item.quantity - (item.reservedQty || 0)),
          status: item.status || 'OK',
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName || item.warehouse?.name,
        }));
        setInventory(items);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      toast.error('Không thể tải danh sách tồn kho');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Filter inventory
  const filteredInventory = inventory.filter((item) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !item.partNumber?.toLowerCase().includes(searchLower) &&
        !item.name?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'critical' && item.status !== 'CRITICAL' && item.status !== 'OUT_OF_STOCK') {
        return false;
      }
      if (filters.status === 'reorder' && item.status !== 'REORDER') {
        return false;
      }
      if (filters.status === 'ok' && item.status !== 'OK') {
        return false;
      }
    }

    // Category filter
    if (filters.category !== 'all' && item.category !== filters.category) {
      return false;
    }

    return true;
  });

  // Handlers
  const handleAdjust = (item?: InventoryItem) => {
    setAdjustingItem(item || null);
    setAdjustOpen(true);
  };

  const handleAdjustSuccess = () => {
    fetchInventory();
  };

  const handleExport = () => {
    toast.info('Tính năng export đang được phát triển');
  };

  // Get unique categories
  const categories = Array.from(new Set(inventory.map((i) => i.category).filter(Boolean))).sort();

  // Create action items for each row
  const createInventoryActions = (item: InventoryItem): ActionDropdownItem[] => [
    {
      label: 'Xem chi tiết',
      href: `/inventory/${item.partId}`,
    },
    {
      label: 'Điều chỉnh tồn kho',
      onClick: () => handleAdjust(item),
      permission: 'inventory:adjust',
    },
    {
      label: 'Chuyển kho',
      onClick: () => handleAdjust(item),
      permission: 'inventory:adjust',
    },
    {
      label: 'Xem Part',
      href: `/parts/${item.partId}`,
    },
  ];

  const criticalCount = inventory.filter(
    (i) => i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK'
  ).length;
  const reorderCount = inventory.filter((i) => i.status === 'REORDER').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Quản lý Tồn kho
          </h1>
          <p className="text-muted-foreground">
            Theo dõi và điều chỉnh tồn kho theo thời gian thực
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/alerts">
            <Button variant={criticalCount > 0 ? 'destructive' : 'outline'}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              {criticalCount + reorderCount} Cảnh báo
            </Button>
          </Link>
          <PermissionButton
            permission="inventory:adjust"
            onClick={() => handleAdjust()}
          >
            <Settings className="h-4 w-4 mr-2" />
            Điều chỉnh
          </PermissionButton>
        </div>
      </div>

      {/* Stats */}
      <StatsCards inventory={inventory} />

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm part number, tên..."
            onExport={handleExport}
            onRefresh={fetchInventory}
            isLoading={loading}
            filters={[
              {
                key: 'status',
                label: 'Trạng thái',
                options: [
                  { value: 'critical', label: 'Critical / Hết hàng' },
                  { value: 'reorder', label: 'Cần đặt hàng' },
                  { value: 'ok', label: 'Đủ hàng' },
                ],
              },
              {
                key: 'category',
                label: 'Danh mục',
                options: categories.map((c) => ({ value: c, label: c })),
              },
            ]}
            activeFilters={filters}
            onFilterChange={(key, value) =>
              setFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClearFilters={() => setFilters({ status: 'all', category: 'all' })}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part #</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead className="text-right">Tồn kho</TableHead>
                <TableHead className="text-right">Đã đặt</TableHead>
                <TableHead className="text-right">Khả dụng</TableHead>
                <TableHead className="text-right">Đơn giá</TableHead>
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
              ) : filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">Không có dữ liệu tồn kho</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => (
                  <TableRow
                    key={item.partId}
                    className={cn(
                      (item.status === 'CRITICAL' || item.status === 'OUT_OF_STOCK') &&
                        'bg-red-50 dark:bg-red-950/20'
                    )}
                  >
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/inventory/${item.partId}`}
                        className="hover:underline text-primary"
                      >
                        {item.partNumber}
                      </Link>
                      {item.isCritical && (
                        <AlertTriangle className="inline h-3 w-3 ml-1 text-orange-500" />
                      )}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.reserved}</TableCell>
                    <TableCell className="text-right font-medium">{item.available}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.unitCost)}
                    </TableCell>
                    <TableCell className="text-center">
                      <StockStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <ActionDropdown items={createInventoryActions(item)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjust Dialog */}
      <InventoryAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        inventoryItem={
          adjustingItem
            ? {
                partId: adjustingItem.partId,
                partNumber: adjustingItem.partNumber,
                name: adjustingItem.name,
                warehouseId: adjustingItem.warehouseId || '',
                warehouseName: adjustingItem.warehouseName || '',
                quantity: adjustingItem.quantity,
              }
            : null
        }
        onSuccess={handleAdjustSuccess}
      />
    </div>
  );
}

export default InventoryTable;
