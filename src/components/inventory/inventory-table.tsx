'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package, AlertTriangle, Settings, RefreshCw, Plus, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SmartGrid } from '@/components/ui-v2/smart-grid';
import { EditableCell } from '@/components/ui-v2/editable-cell';
import { Column } from '@/components/ui-v2/data-table';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { PermissionButton } from '@/components/ui/permission-button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StockStatus } from '@/types';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ChangeImpactDialog,
  useChangeImpact,
} from '@/components/change-impact';
import { FieldChange } from '@/lib/change-impact/types';

// =============================================================================
// TYPES
// =============================================================================

export interface InventoryItem {
  id: string; // Inventory ID (or Part ID if distinct)
  partId: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  isCritical: boolean;
  minStockLevel: number;
  reorderPoint: number;
  safetyStock: number;
  quantity: number;
  reserved: number;
  available: number;
  status: StockStatus;
  warehouseId?: string;
  warehouseName?: string;
  lotNumber?: string;
  expiryDate?: string;
  locationCode?: string;
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
    // COMPACT: gap-4 → gap-2, mb-6 → mb-3
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 shrink-0">
      <Card className="border-gray-200 dark:border-mrp-border">
        {/* COMPACT: pt-4 → p-3 */}
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono">{inventory.length}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Tổng SKU</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-red-600">{criticalCount}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Critical / Hết hàng</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-amber-600">{reorderCount}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Cần đặt hàng</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-green-600">{okCount}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Đủ hàng</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Field labels for change impact
const INVENTORY_FIELD_LABELS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  quantity: { label: 'Quantity', valueType: 'number' },
  safetyStock: { label: 'Safety Stock', valueType: 'number' },
  minStockLevel: { label: 'Min Stock Level', valueType: 'number' },
  reorderPoint: { label: 'Reorder Point', valueType: 'number' },
};

export function InventoryTable({ initialData = [] }: InventoryTableProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({
    partId: '',
    adjustmentType: 'ADD',
    quantity: '',
    reason: '',
  });
  const [adjusting, setAdjusting] = useState(false);

  // Change Impact state
  const pendingUpdateRef = useRef<{
    rowId: string;
    field: string;
    value: any;
    oldValue: any;
    item: InventoryItem;
  } | null>(null);

  const changeImpact = useChangeImpact({
    onSuccess: () => {
      // Execute the pending update after confirmation
      if (pendingUpdateRef.current) {
        const { rowId, field, value, item } = pendingUpdateRef.current;
        executeUpdate(rowId, field, value, item);
        pendingUpdateRef.current = null;
      }
    },
    onError: () => {
      // Still allow update if impact check fails
      if (pendingUpdateRef.current) {
        const { rowId, field, value, item } = pendingUpdateRef.current;
        executeUpdate(rowId, field, value, item);
        pendingUpdateRef.current = null;
      }
    },
  });

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory');
      const result = await response.json();

      if (response.ok) {
        // Transform data
        const items: InventoryItem[] = (result.data || result || []).map((item: any) => ({
          id: item.id, // Inventory ID
          partId: item.partId || item.part?.id,
          partNumber: item.partNumber || item.part?.partNumber,
          name: item.name || item.part?.name,
          category: item.category || item.part?.category,
          unit: item.unit || item.part?.unit,
          unitCost: item.unitCost || item.part?.unitCost || 0,
          isCritical: item.isCritical || item.part?.isCritical || false,
          minStockLevel: item.minStockLevel || item.part?.planning?.minStockLevel || 0,
          reorderPoint: item.reorderPoint || item.part?.planning?.reorderPoint || 0,
          safetyStock: item.safetyStock || item.part?.planning?.safetyStock || 0,
          quantity: item.quantity || 0,
          reserved: item.reserved || item.reservedQty || 0,
          available: item.available ?? ((item.quantity || 0) - (item.reserved || item.reservedQty || 0)),
          status: item.status || 'OK', // This status might be stale if we edit locally, could recalc
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName || item.warehouse?.name,
          lotNumber: item.lotNumber || null,
          expiryDate: item.expiryDate || null,
          locationCode: item.locationCode || null,
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

  const submitAdjustment = async () => {
    if (!adjustData.partId || !adjustData.quantity) {
      toast.error('Vui lòng chọn part và nhập số lượng');
      return;
    }

    setAdjusting(true);
    try {
      const quantity = parseInt(adjustData.quantity);
      const adjustedQty = adjustData.adjustmentType === 'SUBTRACT' ? -quantity : quantity;

      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: adjustData.partId,
          quantity: adjustedQty,
          reason: adjustData.reason || 'Manual adjustment',
        }),
      });

      if (res.ok) {
        toast.success('Điều chỉnh tồn kho thành công');
        setAdjustDialogOpen(false);
        setAdjustData({ partId: '', adjustmentType: 'ADD', quantity: '', reason: '' });
        fetchInventory();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Điều chỉnh thất bại');
      }
    } catch (error) {
      console.error('Adjustment failed:', error);
      toast.error('Điều chỉnh thất bại');
    } finally {
      setAdjusting(false);
    }
  };

  // Execute the actual update (called after impact confirmation)
  const executeUpdate = async (rowId: string, field: string, value: any, item: InventoryItem) => {
    const oldValue = (item as any)[field];

    // Optimistic Update
    setInventory(prev => prev.map(i => i.id === rowId ? { ...i, [field]: value } : i));

    try {
      if (field === 'quantity') {
        // Update Inventory Record
        await fetch(`/api/inventory/${rowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: Number(value) }),
        });
        toast.success(`Cập nhật số lượng: ${value}`);
      } else if (['minStockLevel', 'reorderPoint', 'safetyStock'].includes(field)) {
        // Update Part Planning
        await fetch(`/api/parts/${item.partId}/planning`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: Number(value) }),
        });
        toast.success(`Cập nhật định mức: ${value}`);
      }
    } catch (error) {
      console.error('Update failed', error);
      toast.error('Cập nhật thất bại');
      // Revert
      setInventory(prev => prev.map(i => i.id === rowId ? { ...i, [field]: oldValue } : i));
    }
  };

  // Update Handler - with Change Impact check
  const handleUpdate = async (rowId: string, field: string, value: any) => {
    // Find item
    const item = inventory.find(i => i.id === rowId);
    if (!item) return;

    const oldValue = (item as any)[field];

    // Skip if value unchanged
    if (oldValue === value || Number(oldValue) === Number(value)) {
      return;
    }

    // Create change object for impact check
    const fieldConfig = INVENTORY_FIELD_LABELS[field];
    if (!fieldConfig) {
      // Unknown field, just execute directly
      executeUpdate(rowId, field, value, item);
      return;
    }

    const changes: FieldChange[] = [{
      field,
      fieldLabel: fieldConfig.label,
      oldValue,
      newValue: value,
      valueType: fieldConfig.valueType,
    }];

    // Store pending update
    pendingUpdateRef.current = { rowId, field, value, oldValue, item };

    // Check impact
    await changeImpact.checkImpact('inventory', rowId, changes);
  };

  // Column definitions - SONG ÁNH 1:1 với InventoryItem interface
  const columns: Column<InventoryItem>[] = useMemo(() => [
    // ===== PART INFO SECTION =====
    {
      key: 'partNumber',
      header: 'Mã Part',
      width: '120px',
      sortable: true,
      sticky: 'left',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Link href={`/inventory/${row.id}`} className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {value}
          </Link>
          {row.isCritical && <AlertTriangle className="h-3 w-3 text-orange-500" />}
        </div>
      )
    },
    {
      key: 'name',
      header: 'Tên Part',
      width: '180px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'lotNumber',
      header: 'Lot Number',
      width: '120px',
      sortable: true,
      render: (value) => value ? (
        <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{value}</span>
      ) : <span className="text-slate-400">-</span>,
    },
    {
      key: 'warehouseName',
      header: 'Kho',
      width: '120px',
      sortable: true,
      render: (value) => <span className="text-sm">{value || '-'}</span>,
    },
    {
      key: 'category',
      header: 'Danh mục',
      width: '120px',
      sortable: true,
      hidden: true,
    },
    {
      key: 'unit',
      header: 'Đơn vị',
      width: '70px',
      align: 'center',
      hidden: true,
    },

    // ===== QUANTITY SECTION =====
    {
      key: 'quantity',
      header: 'Tồn kho',
      width: '100px',
      align: 'right',
      type: 'number',
      sortable: true,
      render: (value, row) => (
        <EditableCell
          value={value}
          rowId={row.id}
          columnId="quantity"
          type="number"
          onSave={(val) => handleUpdate(row.id, 'quantity', val)}
          className="font-bold dark:text-white"
        />
      )
    },
    {
      key: 'reserved',
      header: 'Đã giữ',
      width: '90px',
      align: 'right',
      type: 'number',
      hidden: true,
      render: (value) => <span className="text-amber-600">{value}</span>,
    },
    {
      key: 'available',
      header: 'Khả dụng',
      width: '100px',
      align: 'right',
      type: 'number',
      render: (value) => <span className="text-green-600 font-medium">{value}</span>,
    },

    // ===== PLANNING SECTION =====
    {
      key: 'safetyStock',
      header: 'Safety Stock',
      width: '100px',
      align: 'right',
      type: 'number',
      render: (value, row) => (
        <EditableCell
          value={value}
          rowId={row.id}
          columnId="safetyStock"
          type="number"
          onSave={(val) => handleUpdate(row.id, 'safetyStock', val)}
          className="text-slate-500 dark:text-slate-400"
        />
      )
    },
    {
      key: 'minStockLevel',
      header: 'Min Stock',
      width: '100px',
      align: 'right',
      type: 'number',
      render: (value, row) => (
        <EditableCell
          value={value}
          rowId={row.id}
          columnId="minStockLevel"
          type="number"
          onSave={(val) => handleUpdate(row.id, 'minStockLevel', val)}
          className="text-slate-500 dark:text-slate-400"
        />
      )
    },
    {
      key: 'reorderPoint',
      header: 'Reorder Pt',
      width: '100px',
      align: 'right',
      type: 'number',
      render: (value, row) => (
        <EditableCell
          value={value}
          rowId={row.id}
          columnId="reorderPoint"
          type="number"
          onSave={(val) => handleUpdate(row.id, 'reorderPoint', val)}
          className="text-slate-500 dark:text-slate-400"
        />
      )
    },

    // ===== STATUS & COST SECTION =====
    {
      key: 'status',
      header: 'Trạng thái',
      width: '120px',
      align: 'center',
      sortable: true,
      render: (_, row) => <StockStatusBadge status={row.status} />
    },
    {
      key: 'unitCost',
      header: 'Đơn giá',
      width: '100px',
      align: 'right',
      type: 'currency',
      sortable: true,
      render: (val) => formatCurrency(val)
    },

    // ===== WAREHOUSE SECTION =====
    {
      key: 'warehouseName',
      header: 'Kho',
      width: '120px',
      hidden: true,
      render: (value) => value || 'Mặc định',
    },
  ], [inventory]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header Area */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Smart Inventory Grid
          </h1>
          <p className="text-xs text-muted-foreground">Excel-mode enabled: Click cells to edit.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchInventory()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <PermissionButton
            permission="inventory:adjust"
            size="sm"
            onClick={() => setAdjustDialogOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Adjust
          </PermissionButton>
        </div>
      </div>

      <StatsCards inventory={inventory} />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <SmartGrid
          data={inventory}
          columns={columns}
          keyField="id"
          loading={loading}
          searchable
          pagination
          pageSize={20}
          stickyHeader
          columnToggle
          excelMode={{
            enabled: true,
            showRowNumbers: true,
            columnHeaderStyle: 'field-names',
            gridBorders: true,
            showFooter: true,
            sheetName: 'Inventory',
            compactMode: true,
          }}
        />
      </div>

      {/* Change Impact Dialog */}
      <ChangeImpactDialog
        open={changeImpact.showDialog}
        onOpenChange={changeImpact.setShowDialog}
        result={changeImpact.result}
        loading={changeImpact.loading}
        onConfirm={changeImpact.confirm}
        onCancel={() => {
          changeImpact.cancel();
          pendingUpdateRef.current = null;
        }}
      />

      {/* Adjust Inventory Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
            <DialogDescription>
              Thêm hoặc bớt số lượng tồn kho cho một part
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Chọn Part *</Label>
              <Select
                value={adjustData.partId}
                onValueChange={(value) =>
                  setAdjustData({ ...adjustData, partId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn part cần điều chỉnh" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.partId} value={item.partId}>
                      {item.partNumber} - {item.name} (Hiện có: {item.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại điều chỉnh</Label>
                <Select
                  value={adjustData.adjustmentType}
                  onValueChange={(value) =>
                    setAdjustData({ ...adjustData, adjustmentType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADD">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-600" />
                        Thêm vào
                      </span>
                    </SelectItem>
                    <SelectItem value="SUBTRACT">
                      <span className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-red-600" />
                        Trừ đi
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustQty">Số lượng *</Label>
                <Input
                  id="adjustQty"
                  type="number"
                  min="1"
                  value={adjustData.quantity}
                  onChange={(e) =>
                    setAdjustData({ ...adjustData, quantity: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {/* Preview of quantity after adjustment */}
            {adjustData.partId && adjustData.quantity && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                {(() => {
                  const selectedItem = inventory.find(item => item.partId === adjustData.partId);
                  if (!selectedItem) return null;
                  const currentQty = selectedItem.quantity;
                  const adjustQty = parseInt(adjustData.quantity) || 0;
                  const newQty = adjustData.adjustmentType === 'ADD'
                    ? currentQty + adjustQty
                    : currentQty - adjustQty;
                  const isNegative = newQty < 0;

                  return (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Kết quả sau điều chỉnh:</span>
                      <div className="flex items-center gap-2 font-medium">
                        <span>{currentQty}</span>
                        <span className="text-slate-400">→</span>
                        <span className={isNegative ? 'text-red-600' : adjustData.adjustmentType === 'ADD' ? 'text-green-600' : 'text-orange-600'}>
                          {newQty}
                        </span>
                        {isNegative && (
                          <span className="text-xs text-red-500">(không đủ tồn kho!)</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Lý do điều chỉnh</Label>
              <Textarea
                id="reason"
                value={adjustData.reason}
                onChange={(e) =>
                  setAdjustData({ ...adjustData, reason: e.target.value })
                }
                placeholder="Nhập lý do điều chỉnh..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setAdjustDialogOpen(false)}
                disabled={adjusting}
              >
                Hủy
              </Button>
              <Button onClick={submitAdjustment} disabled={adjusting}>
                {adjusting ? 'Đang xử lý...' : 'Xác nhận'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InventoryTable;
