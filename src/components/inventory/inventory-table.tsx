'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Package, AlertTriangle, Settings, RefreshCw, Plus, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SmartGrid } from '@/components/ui-v2/smart-grid';
import { EditableCell } from '@/components/ui-v2/editable-cell';
import { Column } from '@/components/ui-v2/data-table';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { PermissionButton } from '@/components/ui/permission-button';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
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

function StatsCards({ summary }: { summary: { total: number; critical: number; reorder: number; ok: number } }) {
  const { t } = useLanguage();
  return (
    // COMPACT: gap-4 → gap-2, mb-6 → mb-3
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 shrink-0">
      <Card className="border-gray-200 dark:border-mrp-border">
        {/* COMPACT: pt-4 → p-3 */}
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono">{summary.total}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{t('inv.totalSKU')}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-red-600">{summary.critical}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{t('inv.criticalOutOfStock')}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-amber-600">{summary.reorder}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{t('inv.reorderNeeded')}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-green-600">{summary.ok}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{t('inv.inStock')}</p>
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
  const { t } = useLanguage();

  // Server-side paginated data
  const {
    data: rawInventory,
    loading,
    pagination,
    meta,
    refresh,
    setSearch,
    setFilters,
  } = usePaginatedData<InventoryItem>({
    endpoint: '/api/inventory',
    initialPageSize: 50,
  });

  // Transform raw API data (handle both flat and nested response shapes)
  const inventory = useMemo(() => {
    return rawInventory.map((item: any) => ({
      id: item.id,
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
      status: item.status || 'OK',
      warehouseId: item.warehouseId,
      warehouseName: item.warehouseName || item.warehouse?.name,
      lotNumber: item.lotNumber || null,
      expiryDate: item.expiryDate || null,
      locationCode: item.locationCode || null,
    })) as InventoryItem[];
  }, [rawInventory]);

  // Summary counts from API response (stored alongside pagination)
  const [summary, setSummary] = useState({ total: 0, critical: 0, reorder: 0, ok: 0 });

  // Fetch summary from the raw API response
  useEffect(() => {
    // The API returns summary counts alongside data
    // We need to extract these from a fresh fetch
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/inventory?page=1&pageSize=1');
        const result = await res.json();
        if (result.summary) {
          setSummary(result.summary);
        } else if (result.pagination) {
          // Fallback: compute from pagination totalItems
          setSummary(prev => ({ ...prev, total: result.pagination.totalItems }));
        }
      } catch {
        // Fallback: use local data
      }
    };
    fetchSummary();
  }, [rawInventory]); // Re-fetch summary when data changes

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({
    inventoryId: '',   // inventory record id (unique per part+warehouse+lot)
    partId: '',
    warehouseId: '',
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

  // Local optimistic state overlay
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<InventoryItem>>>({});

  // Merge server data with local optimistic updates
  const displayInventory = useMemo(() => {
    if (Object.keys(localUpdates).length === 0) return inventory;
    return inventory.map(item => {
      const updates = localUpdates[item.id];
      return updates ? { ...item, ...updates } : item;
    });
  }, [inventory, localUpdates]);

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

  const submitAdjustment = async () => {
    if (!adjustData.partId || !adjustData.warehouseId || !adjustData.quantity) {
      toast.error(t('inv.selectPartError'));
      return;
    }

    setAdjusting(true);
    try {
      const quantity = parseInt(adjustData.quantity);

      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: adjustData.partId,
          warehouseId: adjustData.warehouseId,
          adjustmentType: adjustData.adjustmentType === 'ADD' ? 'add' : 'subtract',
          quantity,
          reason: adjustData.reason || 'Manual adjustment',
        }),
      });

      if (res.ok) {
        toast.success(t('inv.adjustSuccess'));
        setAdjustDialogOpen(false);
        setAdjustData({ inventoryId: '', partId: '', warehouseId: '', adjustmentType: 'ADD', quantity: '', reason: '' });
        setLocalUpdates({});
        refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || t('inv.adjustFailed'));
      }
    } catch (error) {
      console.error('Adjustment failed:', error);
      toast.error(t('inv.adjustFailed'));
    } finally {
      setAdjusting(false);
    }
  };

  // Execute the actual update (called after impact confirmation)
  const executeUpdate = async (rowId: string, field: string, value: any, item: InventoryItem) => {
    const oldValue = (item as any)[field];

    // Optimistic Update via local overlay
    setLocalUpdates(prev => ({ ...prev, [rowId]: { ...prev[rowId], [field]: value } }));

    try {
      if (field === 'quantity') {
        // Update Inventory Record
        await fetch(`/api/inventory/${rowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: Number(value) }),
        });
        toast.success(t('inv.updateQtySuccess', { value }));
      } else if (['minStockLevel', 'reorderPoint', 'safetyStock'].includes(field)) {
        // Update Part Planning
        await fetch(`/api/parts/${item.partId}/planning`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: Number(value) }),
        });
        toast.success(t('inv.updatePlanSuccess', { value }));
      }
    } catch (error) {
      console.error('Update failed', error);
      toast.error(t('inv.updateFailed'));
      // Revert optimistic update
      setLocalUpdates(prev => {
        const copy = { ...prev };
        if (copy[rowId]) {
          const updated = { ...copy[rowId] };
          delete (updated as any)[field];
          if (Object.keys(updated).length === 0) delete copy[rowId];
          else copy[rowId] = updated;
        }
        return copy;
      });
    }
  };

  // Update Handler - with Change Impact check
  const handleUpdate = async (rowId: string, field: string, value: any) => {
    // Find item
    const item = displayInventory.find(i => i.id === rowId);
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
      header: t('inv.partNumber'),
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
      header: t('inv.partName'),
      width: '180px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'lotNumber',
      header: 'Lot Number',
      width: '120px',
      sortable: true,
      render: (value) => value ? String(value) : <span className="text-slate-400">-</span>,
    },
    {
      key: 'warehouseName',
      header: t('inv.warehouse'),
      width: '120px',
      sortable: true,
      render: (value) => <span className="text-sm">{value || '-'}</span>,
    },
    {
      key: 'category',
      header: t('column.category'),
      width: '120px',
      sortable: true,
      hidden: true,
    },
    {
      key: 'unit',
      header: t('column.unit'),
      width: '70px',
      hidden: true,
    },

    // ===== QUANTITY SECTION =====
    {
      key: 'quantity',
      header: t('inv.quantity'),
      width: '100px',
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
      header: t('inv.reserved'),
      width: '90px',
      type: 'number',
      hidden: true,
      render: (value) => <span className="text-amber-600">{value}</span>,
    },
    {
      key: 'available',
      header: t('inv.available'),
      width: '100px',
      type: 'number',
      render: (value) => <span className="text-green-600 font-medium">{value}</span>,
    },

    // ===== PLANNING SECTION =====
    {
      key: 'safetyStock',
      header: 'Safety Stock',
      width: '100px',
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
      header: t('column.status'),
      width: '120px',
      sortable: true,
      cellClassName: (_, row) => {
        const map: Record<string, string> = {
          OK: 'bg-green-100 dark:bg-green-900/30',
          REORDER: 'bg-amber-100 dark:bg-amber-900/30',
          CRITICAL: 'bg-red-100 dark:bg-red-900/30',
          OUT_OF_STOCK: 'bg-red-100 dark:bg-red-900/30',
        };
        return map[row.status] || '';
      },
      render: (_, row) => {
        const labels: Record<string, string> = {
          OK: t('inventoryStatus.ok'), REORDER: t('inventoryStatus.reorder'), CRITICAL: t('inventoryStatus.critical'), OUT_OF_STOCK: t('inventoryStatus.outOfStock'),
        };
        return <span className="text-xs font-medium">{labels[row.status] || row.status}</span>;
      },
    },
    {
      key: 'unitCost',
      header: t('column.unitCost'),
      width: '100px',
      type: 'currency',
      sortable: true,
      render: (val) => formatCurrency(val)
    },

    // ===== WAREHOUSE SECTION =====
    {
      key: 'warehouseName',
      header: t('inv.warehouse'),
      width: '120px',
      hidden: true,
      render: (value) => value || t('inv.defaultWarehouse'),
    },
  ], [displayInventory, t]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header Area */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('inv.pageTitle')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('inv.pageDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setLocalUpdates({}); refresh(); }}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            {t('common.refresh')}
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

      <StatsCards summary={summary} />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <SmartGrid
          data={displayInventory}
          columns={columns}
          keyField="id"
          loading={loading}
          searchable
          pagination={false}
          virtualize
          virtualRowHeight={36}
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
            <DialogTitle>{t('inv.adjustTitle')}</DialogTitle>
            <DialogDescription>
              {t('inv.adjustDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('inv.selectPart')}</Label>
              <Select
                value={adjustData.inventoryId}
                onValueChange={(value) => {
                  const item = displayInventory.find(i => i.id === value);
                  if (item) {
                    setAdjustData({
                      ...adjustData,
                      inventoryId: value,
                      partId: item.partId,
                      warehouseId: item.warehouseId || '',
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inv.selectPartPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {displayInventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.partNumber} - {item.name} [{item.warehouseName || 'N/A'}] (SL: {item.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('inv.adjustType')}</Label>
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
                        {t('inv.addStock')}
                      </span>
                    </SelectItem>
                    <SelectItem value="SUBTRACT">
                      <span className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-red-600" />
                        {t('inv.subtractStock')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adjustQty">{t('inv.quantityLabel')}</Label>
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
            {adjustData.inventoryId && adjustData.quantity && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                {(() => {
                  const selectedItem = displayInventory.find(item => item.id === adjustData.inventoryId);
                  if (!selectedItem) return null;
                  const currentQty = selectedItem.quantity;
                  const adjustQty = parseInt(adjustData.quantity) || 0;
                  const newQty = adjustData.adjustmentType === 'ADD'
                    ? currentQty + adjustQty
                    : currentQty - adjustQty;
                  const isNegative = newQty < 0;

                  return (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t('inv.adjustResult')}</span>
                      <div className="flex items-center gap-2 font-medium">
                        <span>{currentQty}</span>
                        <span className="text-slate-400">→</span>
                        <span className={isNegative ? 'text-red-600' : adjustData.adjustmentType === 'ADD' ? 'text-green-600' : 'text-orange-600'}>
                          {newQty}
                        </span>
                        {isNegative && (
                          <span className="text-xs text-red-500">{t('inv.insufficientStock')}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">{t('inv.adjustReason')}</Label>
              <Textarea
                id="reason"
                value={adjustData.reason}
                onChange={(e) =>
                  setAdjustData({ ...adjustData, reason: e.target.value })
                }
                placeholder={t('inv.adjustReasonPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setAdjustDialogOpen(false)}
                disabled={adjusting}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={submitAdjustment} disabled={adjusting}>
                {adjusting ? t('common.processing') : t('common.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InventoryTable;
