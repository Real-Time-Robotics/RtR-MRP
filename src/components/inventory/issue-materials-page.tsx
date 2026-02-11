'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PackageMinus,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  Package,
  Layers,
  Hash,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/ui-v2/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { PermissionButton } from '@/components/ui/permission-button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface PendingAllocation {
  id: string;
  workOrderId: string;
  woNumber: string;
  woStatus: string;
  productName: string;
  productSku: string;
  partId: string;
  partNumber: string;
  partName: string;
  unit: string;
  requiredQty: number;
  allocatedQty: number;
  issuedQty: number;
  remainingQty: number;
  status: string;
}

interface Stats {
  pendingCount: number;
  partsAffected: number;
  totalQtyToIssue: number;
}

interface InventoryOption {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  available: number;
  lotNumber?: string;
}

const ISSUE_TYPES = [
  { value: 'work_order', label: 'Xuất cho WO (Work Order)' },
  { value: 'maintenance', label: 'Bảo trì (Maintenance)' },
  { value: 'sample', label: 'Mẫu (Sample)' },
  { value: 'scrap', label: 'Phế liệu (Scrap)' },
  { value: 'internal', label: 'Nội bộ (Internal Use)' },
  { value: 'other', label: 'Khác (Other)' },
];

interface ActiveWorkOrder {
  id: string;
  woNumber: string;
  status: string;
  quantity: number;
  productName: string;
}

// =============================================================================
// STATS CARDS
// =============================================================================

function StatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-lg font-semibold font-mono">{stats.pendingCount}</div>
              <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Pending Issues</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-500" />
            <div>
              <div className="text-lg font-semibold font-mono">{stats.partsAffected}</div>
              <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Parts Affected</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-lg font-semibold font-mono">{stats.totalQtyToIssue}</div>
              <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Total Qty to Issue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function IssueMaterialsPage() {
  const [allocations, setAllocations] = useState<PendingAllocation[]>([]);
  const [stats, setStats] = useState<Stats>({ pendingCount: 0, partsAffected: 0, totalQtyToIssue: 0 });
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkIssuing, setBulkIssuing] = useState(false);

  // Ad-hoc dialog state
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [adhocSubmitting, setAdhocSubmitting] = useState(false);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [adhocData, setAdhocData] = useState({
    inventoryId: '',
    partId: '',
    warehouseId: '',
    quantity: '',
    lotNumber: '',
    issueType: '',
    reason: '',
    notes: '',
    workOrderId: '',
  });
  const [activeWorkOrders, setActiveWorkOrders] = useState<ActiveWorkOrder[]>([]);

  // Fetch pending allocations
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/issue');
      const result = await res.json();
      if (result.success) {
        setAllocations(result.data.allocations);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch pending issues:', error);
      toast.error('Không thể tải danh sách xuất kho');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inventory for ad-hoc dialog
  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      const result = await res.json();
      const items = (result.data || result || []).map((item: any) => ({
        id: item.id,
        partId: item.partId || item.part?.id,
        partNumber: item.partNumber || item.part?.partNumber,
        partName: item.name || item.part?.name,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName || item.warehouse?.name || 'N/A',
        quantity: item.quantity || 0,
        available: (item.quantity || 0) - (item.reservedQty || 0),
        lotNumber: item.lotNumber || undefined,
      }));
      setInventoryOptions(items.filter((i: InventoryOption) => i.available > 0));
    } catch {
      // Ignore
    }
  }, []);

  // Fetch active work orders for WO issue type
  const fetchActiveWorkOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/production?status=in_progress,released&limit=100');
      const result = await res.json();
      const items = (result.data || result || []).map((wo: any) => ({
        id: wo.id,
        woNumber: wo.woNumber,
        status: wo.status,
        quantity: wo.quantity,
        productName: wo.product?.name || wo.productName || '',
      }));
      setActiveWorkOrders(items);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Issue single allocation
  const handleIssueSingle = async (allocationId: string) => {
    setIssuing(allocationId);
    try {
      const res = await fetch('/api/inventory/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'wo', allocationIds: [allocationId] }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Xuất kho thành công');
        fetchData();
      } else {
        toast.error(result.error || 'Xuất kho thất bại');
      }
    } catch {
      toast.error('Xuất kho thất bại');
    } finally {
      setIssuing(null);
    }
  };

  // Bulk issue selected
  const handleBulkIssue = async () => {
    if (selectedIds.size === 0) return;
    setBulkIssuing(true);
    try {
      const res = await fetch('/api/inventory/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'wo', allocationIds: Array.from(selectedIds) }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Đã xuất ${selectedIds.size} dòng thành công`);
        setSelectedIds(new Set());
        fetchData();
      } else {
        toast.error(result.error || 'Xuất kho thất bại');
      }
    } catch {
      toast.error('Xuất kho thất bại');
    } finally {
      setBulkIssuing(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === allocations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allocations.map((a) => a.id)));
    }
  };

  // Ad-hoc submit
  const handleAdhocSubmit = async () => {
    if (!adhocData.partId || !adhocData.warehouseId || !adhocData.quantity || !adhocData.issueType || !adhocData.reason) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (adhocData.issueType === 'work_order' && !adhocData.workOrderId) {
      toast.error('Vui lòng chọn Work Order');
      return;
    }

    setAdhocSubmitting(true);
    try {
      const res = await fetch('/api/inventory/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'adhoc',
          partId: adhocData.partId,
          warehouseId: adhocData.warehouseId,
          quantity: parseInt(adhocData.quantity),
          lotNumber: adhocData.lotNumber || undefined,
          issueType: adhocData.issueType,
          reason: adhocData.reason,
          notes: adhocData.notes || undefined,
          workOrderId: adhocData.issueType === 'work_order' ? adhocData.workOrderId : undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Xuất kho thành công');
        setAdhocOpen(false);
        setAdhocData({ inventoryId: '', partId: '', warehouseId: '', quantity: '', lotNumber: '', issueType: '', reason: '', notes: '', workOrderId: '' });
        fetchData();
      } else {
        toast.error(result.error || 'Xuất kho thất bại');
      }
    } catch {
      toast.error('Xuất kho thất bại');
    } finally {
      setAdhocSubmitting(false);
    }
  };

  // Open ad-hoc dialog
  const openAdhocDialog = () => {
    fetchInventory();
    fetchActiveWorkOrders();
    setAdhocOpen(true);
  };

  // Table columns
  const columns: Column<PendingAllocation>[] = useMemo(() => [
    {
      key: 'select' as any,
      header: '',
      width: '40px',
      render: (_, row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => toggleSelect(row.id)}
        />
      ),
    },
    {
      key: 'woNumber',
      header: 'WO Number',
      width: '130px',
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{value}</span>
          <p className="text-[10px] text-muted-foreground truncate">{row.productName}</p>
        </div>
      ),
    },
    {
      key: 'partNumber',
      header: 'Part',
      width: '160px',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{row.partName}</p>
        </div>
      ),
    },
    {
      key: 'requiredQty',
      header: 'Required',
      width: '80px',
      align: 'right',
      sortable: true,
    },
    {
      key: 'allocatedQty',
      header: 'Allocated',
      width: '80px',
      align: 'right',
      sortable: true,
    },
    {
      key: 'issuedQty',
      header: 'Issued',
      width: '80px',
      align: 'right',
      sortable: true,
      render: (value) => (
        <span className={value > 0 ? 'text-green-600 font-medium' : ''}>{value}</span>
      ),
    },
    {
      key: 'remainingQty',
      header: 'Remaining',
      width: '90px',
      align: 'right',
      render: (value) => (
        <span className="font-bold text-amber-600">{value}</span>
      ),
    },
    {
      key: 'id' as any,
      header: 'Action',
      width: '100px',
      align: 'center',
      render: (_, row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleIssueSingle(row.id)}
          disabled={issuing === row.id}
          className="h-7 text-xs"
        >
          {issuing === row.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Issue
            </>
          )}
        </Button>
      ),
    },
  ], [selectedIds, issuing]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <PageHeader
        title="Issue Materials"
        description="Xuất kho vật tư cho Work Order hoặc ad-hoc (bảo trì, mẫu, phế liệu...)"
        backHref="/inventory"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={handleBulkIssue}
                disabled={bulkIssuing}
              >
                {bulkIssuing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Issue Selected ({selectedIds.size})
              </Button>
            )}
            <PermissionButton
              permission="inventory:issue"
              size="sm"
              variant="default"
              onClick={openAdhocDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ad-Hoc Issue
            </PermissionButton>
          </div>
        }
      />

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="mb-2 flex items-center gap-2">
          {allocations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={toggleSelectAll}
            >
              {selectedIds.size === allocations.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>
        <DataTable
          data={allocations}
          columns={columns}
          keyField="id"
          emptyMessage="Không có vật tư nào đang chờ xuất kho"
          searchable
          stickyHeader
          excelMode={{
            enabled: true,
            showRowNumbers: true,
            columnHeaderStyle: 'field-names',
            gridBorders: true,
            showFooter: true,
            sheetName: 'Issue Materials',
            compactMode: true,
          }}
        />
      </div>

      {/* Ad-Hoc Issue Dialog */}
      <Dialog open={adhocOpen} onOpenChange={setAdhocOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              Ad-Hoc Issue
            </DialogTitle>
            <DialogDescription>
              Xuất kho vật tư cho Work Order hoặc mục đích khác (bảo trì, mẫu, phế liệu...)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Part / Inventory select */}
            <div className="space-y-2">
              <Label>Chọn vật tư *</Label>
              <Select
                value={adhocData.inventoryId}
                onValueChange={(value) => {
                  const item = inventoryOptions.find((i) => i.id === value);
                  if (item) {
                    setAdhocData({
                      ...adhocData,
                      inventoryId: value,
                      partId: item.partId,
                      warehouseId: item.warehouseId,
                      lotNumber: item.lotNumber || '',
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vật tư cần xuất" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.partNumber} - {item.partName} [{item.warehouseName}] (KD: {item.available})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity + Issue Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adhocQty">Số lượng *</Label>
                <Input
                  id="adhocQty"
                  type="number"
                  min="1"
                  value={adhocData.quantity}
                  onChange={(e) => setAdhocData({ ...adhocData, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại xuất *</Label>
                <Select
                  value={adhocData.issueType}
                  onValueChange={(value) => setAdhocData({ ...adhocData, issueType: value, workOrderId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Work Order selector */}
            {adhocData.issueType === 'work_order' && (
              <div className="space-y-2">
                <Label>Chọn Work Order *</Label>
                <Select
                  value={adhocData.workOrderId}
                  onValueChange={(value) => setAdhocData({ ...adhocData, workOrderId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn WO đang mở..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWorkOrders.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Không có WO nào đang mở
                      </SelectItem>
                    ) : (
                      activeWorkOrders.map((wo) => (
                        <SelectItem key={wo.id} value={wo.id}>
                          {wo.woNumber} - {wo.productName} (SL: {wo.quantity})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview */}
            {adhocData.inventoryId && adhocData.quantity && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border text-sm">
                {(() => {
                  const selected = inventoryOptions.find((i) => i.id === adhocData.inventoryId);
                  if (!selected) return null;
                  const qty = parseInt(adhocData.quantity) || 0;
                  const newAvail = selected.available - qty;
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Sau xuất kho:</span>
                      <div className="flex items-center gap-2 font-medium">
                        <span>{selected.available}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className={newAvail < 0 ? 'text-red-600' : 'text-green-600'}>
                          {newAvail}
                        </span>
                        {newAvail < 0 && (
                          <span className="text-xs text-red-500">(không đủ!)</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="adhocReason">Lý do xuất kho *</Label>
              <Input
                id="adhocReason"
                value={adhocData.reason}
                onChange={(e) => setAdhocData({ ...adhocData, reason: e.target.value })}
                placeholder="Nhập lý do..."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="adhocNotes">Ghi chú</Label>
              <Textarea
                id="adhocNotes"
                value={adhocData.notes}
                onChange={(e) => setAdhocData({ ...adhocData, notes: e.target.value })}
                placeholder="Ghi chú thêm (tuỳ chọn)..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAdhocOpen(false)} disabled={adhocSubmitting}>
                Hủy
              </Button>
              <Button onClick={handleAdhocSubmit} disabled={adhocSubmitting}>
                {adhocSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <PackageMinus className="h-4 w-4 mr-2" />
                    Xuất kho
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IssueMaterialsPage;
