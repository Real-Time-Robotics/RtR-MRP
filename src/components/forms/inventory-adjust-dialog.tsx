'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientLogger } from '@/lib/client-logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, ArrowRightLeft, Plus, Minus, RefreshCw, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n/language-context';

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const adjustmentSchema = z.object({
  partId: z.string().min(1, 'Part là bắt buộc'),
  warehouseId: z.string().min(1, 'Kho là bắt buộc'),
  adjustmentType: z.enum(['add', 'subtract', 'set', 'cycle_count']),
  quantity: z.number().int().min(0, 'Số lượng >= 0'),
  reason: z.string().min(1, 'Lý do là bắt buộc'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const transferSchema = z.object({
  partId: z.string().min(1, 'Part là bắt buộc'),
  fromWarehouseId: z.string().min(1, 'Kho nguồn là bắt buộc'),
  toWarehouseId: z.string().min(1, 'Kho đích là bắt buộc'),
  quantity: z.number().int().min(1, 'Số lượng >= 1'),
  reason: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;
type TransferFormData = z.infer<typeof transferSchema>;

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface InventoryItem {
  partId: string;
  partNumber: string;
  name: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

interface InventoryAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItem?: InventoryItem | null;
  onSuccess?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function InventoryAdjustDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryAdjustDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeTab, setActiveTab] = useState<'adjust' | 'transfer'>('adjust');

  const ADJUSTMENT_REASONS = [
    { value: 'inventory_adjust', label: t('adjReason.inventoryAdjust') },
    { value: 'cycle_counting', label: t('adjReason.cycleCounting') },
    { value: 'damaged', label: t('adjReason.damaged') },
    { value: 'expired', label: t('adjReason.expired') },
    { value: 'additional_receipt', label: t('adjReason.additionalReceipt') },
    { value: 'internal_issue', label: t('adjReason.internalIssue') },
    { value: 'data_error', label: t('adjReason.dataError') },
    { value: 'other', label: t('adjReason.other') },
  ];

  // Adjustment form
  const adjustForm = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      partId: '',
      warehouseId: '',
      adjustmentType: 'add',
      quantity: 0,
      reason: '',
      reference: '',
      notes: '',
    },
  });

  // Transfer form
  const transferForm = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      partId: '',
      fromWarehouseId: '',
      toWarehouseId: '',
      quantity: 1,
      reason: '',
    },
  });

  // Fetch parts and warehouses
  useEffect(() => {
    if (open) {
      fetchParts();
      fetchWarehouses();
    }
  }, [open]);

  const fetchParts = async () => {
    try {
      const res = await fetch('/api/parts?limit=1000');
      if (res.ok) {
        const result = await res.json();
        setParts(result.data || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch parts', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses');
      if (res.ok) {
        const result = await res.json();
        setWarehouses(result.data || result || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch warehouses', error);
    }
  };

  // Pre-fill form when inventoryItem changes
  useEffect(() => {
    if (open && inventoryItem) {
      adjustForm.reset({
        partId: inventoryItem.partId,
        warehouseId: inventoryItem.warehouseId,
        adjustmentType: 'add',
        quantity: 0,
        reason: '',
        reference: '',
        notes: '',
      });
      transferForm.reset({
        partId: inventoryItem.partId,
        fromWarehouseId: inventoryItem.warehouseId,
        toWarehouseId: '',
        quantity: 1,
        reason: '',
      });
    } else if (open) {
      adjustForm.reset({
        partId: '',
        warehouseId: '',
        adjustmentType: 'add',
        quantity: 0,
        reason: '',
        reference: '',
        notes: '',
      });
      transferForm.reset({
        partId: '',
        fromWarehouseId: '',
        toWarehouseId: '',
        quantity: 1,
        reason: '',
      });
    }
  }, [open, inventoryItem, adjustForm, transferForm]);

  const onAdjustSubmit = async (data: AdjustmentFormData) => {
    setLoading(true);

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            adjustForm.setError(field as keyof AdjustmentFormData, {
              type: 'server',
              message: (messages as string[]).join(', '),
            });
          });
          return;
        }
        throw new Error(result.message || result.error || t('form.error'));
      }

      toast.success(t('invAdjust.adjustSuccess'));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      clientLogger.error('Failed to adjust inventory', error);
      toast.error(error instanceof Error ? error.message : t('form.error'));
    } finally {
      setLoading(false);
    }
  };

  const onTransferSubmit = async (data: TransferFormData) => {
    if (data.fromWarehouseId === data.toWarehouseId) {
      transferForm.setError('toWarehouseId', {
        type: 'manual',
        message: t('invAdjust.destDifferent'),
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            transferForm.setError(field as keyof TransferFormData, {
              type: 'server',
              message: (messages as string[]).join(', '),
            });
          });
          return;
        }
        throw new Error(result.message || result.error || t('form.error'));
      }

      toast.success(t('invAdjust.transferSuccess'));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      clientLogger.error('Failed to transfer inventory', error);
      toast.error(error instanceof Error ? error.message : t('form.error'));
    } finally {
      setLoading(false);
    }
  };

  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <Plus className="h-4 w-4" />;
      case 'subtract':
        return <Minus className="h-4 w-4" />;
      case 'set':
        return <Target className="h-4 w-4" />;
      case 'cycle_count':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('invAdjust.title')}
          </DialogTitle>
          <DialogDescription>
            {inventoryItem
              ? t('invAdjust.descForItem', { partNumber: inventoryItem.partNumber, name: inventoryItem.name })
              : t('invAdjust.descGeneral')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'adjust' | 'transfer')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="adjust" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              {t('invAdjust.tabAdjust')}
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex items-center gap-1">
              <ArrowRightLeft className="h-4 w-4" />
              {t('invAdjust.tabTransfer')}
            </TabsTrigger>
          </TabsList>

          {/* Adjustment Tab */}
          <TabsContent value="adjust">
            <Form {...adjustForm}>
              <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={adjustForm.control}
                    name="partId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('invAdjust.part')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!inventoryItem}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('invAdjust.selectPart')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parts.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.partNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={adjustForm.control}
                    name="warehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('invAdjust.warehouse')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!inventoryItem}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('invAdjust.selectWarehouse')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.code} - {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={adjustForm.control}
                  name="adjustmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('invAdjust.adjustType')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="add">
                            <span className="flex items-center gap-2">
                              <Plus className="h-4 w-4 text-green-600" />
                              {t('invAdjust.add')}
                            </span>
                          </SelectItem>
                          <SelectItem value="subtract">
                            <span className="flex items-center gap-2">
                              <Minus className="h-4 w-4 text-red-600" />
                              {t('invAdjust.subtract')}
                            </span>
                          </SelectItem>
                          <SelectItem value="set">
                            <span className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-blue-600" />
                              {t('invAdjust.setValue')}
                            </span>
                          </SelectItem>
                          <SelectItem value="cycle_count">
                            <span className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-purple-600" />
                              {t('invAdjust.cycleCount')}
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {adjustForm.watch('adjustmentType') === 'add' && t('invAdjust.addDesc')}
                        {adjustForm.watch('adjustmentType') === 'subtract' && t('invAdjust.subtractDesc')}
                        {adjustForm.watch('adjustmentType') === 'set' && t('invAdjust.setDesc')}
                        {adjustForm.watch('adjustmentType') === 'cycle_count' && t('invAdjust.cycleCountDesc')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adjustForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('invAdjust.quantity')}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      {inventoryItem && (
                        <FormDescription>
                          {t('invAdjust.currentStock', { quantity: String(inventoryItem.quantity) })}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adjustForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('invAdjust.reason')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('invAdjust.selectReason')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ADJUSTMENT_REASONS.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adjustForm.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('invAdjust.reference')}</FormLabel>
                      <FormControl>
                        <Input placeholder="VD: INV-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adjustForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('invAdjust.notes')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('invAdjust.notesPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    {t('form.cancel')}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('invAdjust.adjustBtn')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Form {...transferForm}>
              <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-4">
                <FormField
                  control={transferForm.control}
                  name="partId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('invAdjust.part')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!inventoryItem}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('invAdjust.selectPart')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.partNumber} - {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={transferForm.control}
                    name="fromWarehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('invAdjust.fromWarehouse')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!inventoryItem}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('invAdjust.fromPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.code} - {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferForm.control}
                    name="toWarehouseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('invAdjust.toWarehouse')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('invAdjust.toPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses
                              .filter((w) => w.id !== transferForm.watch('fromWarehouseId'))
                              .map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.code} - {w.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={transferForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('invAdjust.transferQty')}</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      {inventoryItem && (
                        <FormDescription>
                          {t('invAdjust.sourceStock', { quantity: String(inventoryItem.quantity) })}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={transferForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('invAdjust.transferReason')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('invAdjust.transferReasonPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    {t('form.cancel')}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    {t('invAdjust.transferBtn')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default InventoryAdjustDialog;
