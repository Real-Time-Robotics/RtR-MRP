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
import { clientLogger } from '@/lib/client-logger';
import { CompactStatsBar } from '@/components/ui/compact-stats-bar';
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
import { useLanguage } from '@/lib/i18n/language-context';

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

function StatsCards({ stats, t }: { stats: Stats; t: (key: string, params?: Record<string, string>) => string }) {
  return (
    <div className="mb-3 shrink-0">
      <CompactStatsBar stats={[
        { label: t('issueMat.pendingIssues'), value: stats.pendingCount, color: 'text-blue-500' },
        { label: t('issueMat.partsAffected'), value: stats.partsAffected, color: 'text-amber-500' },
        { label: t('issueMat.totalQty'), value: stats.totalQtyToIssue, color: 'text-green-500' },
      ]} />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function IssueMaterialsPage() {
  const { t } = useLanguage();
  const [allocations, setAllocations] = useState<PendingAllocation[]>([]);
  const [stats, setStats] = useState<Stats>({ pendingCount: 0, partsAffected: 0, totalQtyToIssue: 0 });
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkIssuing, setBulkIssuing] = useState(false);

  const issueTypes = useMemo(() => [
    { value: 'work_order', label: t('issueMat.typeWO') },
    { value: 'maintenance', label: t('issueMat.typeMaintenance') },
    { value: 'sample', label: t('issueMat.typeSample') },
    { value: 'scrap', label: t('issueMat.typeScrap') },
    { value: 'internal', label: t('issueMat.typeInternal') },
    { value: 'other', label: t('issueMat.typeOther') },
  ], [t]);

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
      clientLogger.error('Failed to fetch pending issues', error);
      toast.error(t('issueMat.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inventory for ad-hoc dialog
  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      const result = await res.json();
      const items = (result.data || result || []).map((item: Record<string, unknown> & { part?: Record<string, unknown>; warehouse?: Record<string, unknown> }) => ({
        id: item.id as string,
        partId: (item.partId || item.part?.id) as string,
        partNumber: (item.partNumber || item.part?.partNumber) as string,
        partName: (item.name || item.part?.name) as string,
        warehouseId: item.warehouseId as string,
        warehouseName: (item.warehouseName || item.warehouse?.name || 'N/A') as string,
        quantity: (item.quantity as number) || 0,
        available: ((item.quantity as number) || 0) - ((item.reservedQty as number) || 0),
        lotNumber: (item.lotNumber as string) || undefined,
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
      const items = (result.data || result || []).map((wo: Record<string, unknown> & { product?: Record<string, unknown> }) => ({
        id: wo.id as string,
        woNumber: wo.woNumber as string,
        status: wo.status as string,
        quantity: wo.quantity as number,
        productName: (wo.product?.name || wo.productName || '') as string,
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
        toast.success(t('issueMat.issueSuccess'));
        fetchData();
      } else {
        toast.error(result.error || t('issueMat.issueFailed'));
      }
    } catch {
      toast.error(t('issueMat.issueFailed'));
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
        toast.success(t('issueMat.batchSuccess', { count: String(selectedIds.size) }));
        setSelectedIds(new Set());
        fetchData();
      } else {
        toast.error(result.error || t('issueMat.issueFailed'));
      }
    } catch {
      toast.error(t('issueMat.issueFailed'));
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
      toast.error(t('issueMat.fillRequired'));
      return;
    }
    if (adhocData.issueType === 'work_order' && !adhocData.workOrderId) {
      toast.error(t('issueMat.selectWO'));
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
        toast.success(t('issueMat.issueSuccess'));
        setAdhocOpen(false);
        setAdhocData({ inventoryId: '', partId: '', warehouseId: '', quantity: '', lotNumber: '', issueType: '', reason: '', notes: '', workOrderId: '' });
        fetchData();
      } else {
        toast.error(result.error || t('issueMat.issueFailed'));
      }
    } catch {
      toast.error(t('issueMat.issueFailed'));
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
      key: 'select',
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
      sortable: true,
    },
    {
      key: 'allocatedQty',
      header: 'Allocated',
      width: '80px',
      sortable: true,
    },
    {
      key: 'issuedQty',
      header: 'Issued',
      width: '80px',
      sortable: true,
      render: (value) => (
        <span className={value > 0 ? 'text-green-600 font-medium' : ''}>{value}</span>
      ),
    },
    {
      key: 'remainingQty',
      header: 'Remaining',
      width: '90px',
      render: (value) => (
        <span className="font-bold text-amber-600">{value}</span>
      ),
    },
    {
      key: 'id',
      header: 'Action',
      width: '100px',
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
              {t('issueMat.issueBtn')}
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
        title={t('issueMat.title')}
        description={t('issueMat.description')}
        backHref="/inventory"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              {t('issueMat.refresh')}
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
                {t('issueMat.issueSelected')} ({selectedIds.size})
              </Button>
            )}
            <PermissionButton
              permission="inventory:issue"
              size="sm"
              variant="default"
              onClick={openAdhocDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('issueMat.adhocIssue')}
            </PermissionButton>
          </div>
        }
      />

      {/* Stats */}
      <StatsCards stats={stats} t={t} />

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
              {selectedIds.size === allocations.length ? t('issueMat.deselectAll') : t('issueMat.selectAll')}
            </Button>
          )}
        </div>
        <DataTable
          data={allocations}
          columns={columns}
          keyField="id"
          emptyMessage={t('issueMat.noItems')}
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
              {t('issueMat.adhocTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('issueMat.adhocDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Part / Inventory select */}
            <div className="space-y-2">
              <Label>{t('issueMat.selectPart')}</Label>
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
                  <SelectValue placeholder={t('issueMat.selectPartPlaceholder')} />
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
                <Label htmlFor="adhocQty">{t('issueMat.quantity')}</Label>
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
                <Label>{t('issueMat.issueType')}</Label>
                <Select
                  value={adhocData.issueType}
                  onValueChange={(value) => setAdhocData({ ...adhocData, issueType: value, workOrderId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('issueMat.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {issueTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Work Order selector */}
            {adhocData.issueType === 'work_order' && (
              <div className="space-y-2">
                <Label>{t('issueMat.selectWOLabel')}</Label>
                <Select
                  value={adhocData.workOrderId}
                  onValueChange={(value) => setAdhocData({ ...adhocData, workOrderId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('issueMat.selectWOPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWorkOrders.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        {t('issueMat.noOpenWO')}
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
                      <span className="text-slate-600 dark:text-slate-400">{t('issueMat.afterIssue')}</span>
                      <div className="flex items-center gap-2 font-medium">
                        <span>{selected.available}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className={newAvail < 0 ? 'text-red-600' : 'text-green-600'}>
                          {newAvail}
                        </span>
                        {newAvail < 0 && (
                          <span className="text-xs text-red-500">({t('issueMat.insufficient')})</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="adhocReason">{t('issueMat.issueReason')}</Label>
              <Input
                id="adhocReason"
                value={adhocData.reason}
                onChange={(e) => setAdhocData({ ...adhocData, reason: e.target.value })}
                placeholder={t('issueMat.reasonPlaceholder')}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="adhocNotes">{t('issueMat.notes')}</Label>
              <Textarea
                id="adhocNotes"
                value={adhocData.notes}
                onChange={(e) => setAdhocData({ ...adhocData, notes: e.target.value })}
                placeholder={t('issueMat.notesPlaceholder')}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAdhocOpen(false)} disabled={adhocSubmitting}>
                {t('issueMat.cancelBtn')}
              </Button>
              <Button onClick={handleAdhocSubmit} disabled={adhocSubmitting}>
                {adhocSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('issueMat.processing')}
                  </>
                ) : (
                  <>
                    <PackageMinus className="h-4 w-4 mr-2" />
                    {t('issueMat.issueBtn')}
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
