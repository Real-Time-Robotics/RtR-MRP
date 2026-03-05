'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientLogger } from '@/lib/client-logger';
import { z } from 'zod';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Truck, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  ChangeImpactDialog,
  useChangeImpact,
  detectChanges,
} from '@/components/change-impact';
import { FieldChange } from '@/lib/change-impact/types';

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const poLineSchema = z.object({
  partId: z.string().min(1, 'Part là bắt buộc'),
  quantity: z.number().int().min(1, 'Số lượng >= 1'),
  unitPrice: z.number().min(0, 'Giá >= 0'),
});

const purchaseOrderSchema = z.object({
  poNumber: z.string().max(50),
  supplierId: z.string().min(1, 'Nhà cung cấp là bắt buộc'),
  orderDate: z.string().min(1, 'Ngày đặt hàng là bắt buộc'),
  expectedDate: z.string().min(1, 'Ngày dự kiến là bắt buộc'),
  status: z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'received', 'cancelled']),
  currency: z.string(),
  notes: z.string().max(1000).optional().nullable(),
  lines: z.array(poLineSchema).optional(),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: string | Date;
  expectedDate: string | Date;
  status: string;
  currency: string;
  totalAmount?: number;
  notes?: string | null;
  updatedAt?: string | Date;
  supplier?: { id: string; code: string; name: string };
  lines?: Array<{
    id: string;
    partId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    part?: { id: string; partNumber: string; name: string };
  }>;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface Part {
  id: string;
  partNumber: string;
  name: string;
  unitCost: number;
}

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: PurchaseOrder | null;
  initialData?: Partial<PurchaseOrderFormData> | null;
  onSuccess?: (order: PurchaseOrder) => void;
}

// Field config for change impact
const PO_IMPACT_FIELDS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  status: { label: 'Status', valueType: 'string' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function PurchaseOrderForm({ open, onOpenChange, order, initialData, onSuccess }: PurchaseOrderFormProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const isEditing = !!order;

  // Change Impact
  const originalValuesRef = useRef<Record<string, unknown> | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<PurchaseOrderFormData | null>(null);

  const changeImpact = useChangeImpact({
    onSuccess: () => {
      if (pendingSubmitData) performSave(pendingSubmitData);
    },
    onError: () => {
      if (pendingSubmitData) performSave(pendingSubmitData);
    },
  });

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      poNumber: '',
      supplierId: '',
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      status: 'draft',
      currency: 'USD',
      notes: '',
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  // Watch supplierId to filter parts
  const watchedSupplierId = form.watch('supplierId');

  // Fetch suppliers on open
  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  // Fetch parts when supplier changes
  useEffect(() => {
    if (open) {
      fetchParts(watchedSupplierId);
    }
  }, [open, watchedSupplierId]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers?status=active&limit=100');
      if (res.ok) {
        const result = await res.json();
        setSuppliers(result.data || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch suppliers', error);
    }
  };

  const fetchParts = async (supplierId?: string) => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (supplierId) {
        params.set('supplierId', supplierId);
      } else {
        params.set('makeOrBuy', 'BUY');
      }
      const res = await fetch(`/api/parts?${params}`);
      if (res.ok) {
        const result = await res.json();
        setParts(result.data || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch parts', error);
    }
  };

  useEffect(() => {
    if (open) {
      if (order) {
        form.reset({
          poNumber: order.poNumber,
          supplierId: order.supplierId,
          orderDate: format(new Date(order.orderDate), 'yyyy-MM-dd'),
          expectedDate: format(new Date(order.expectedDate), 'yyyy-MM-dd'),
          status: order.status as PurchaseOrderFormData['status'],
          currency: order.currency,
          notes: order.notes || '',
          lines: order.lines?.map((line) => ({
            partId: line.partId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })) || [],
        });
        originalValuesRef.current = { status: order.status };
      } else {
        form.reset({
          poNumber: '',
          supplierId: initialData?.supplierId || '',
          orderDate: initialData?.orderDate || format(new Date(), 'yyyy-MM-dd'),
          expectedDate: initialData?.expectedDate || format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          status: 'draft',
          currency: 'USD',
          notes: initialData?.notes || '',
          lines: initialData?.lines || [],
        });
        originalValuesRef.current = null;
      }
      changeImpact.reset();
      setPendingSubmitData(null);
    }
  // Note: Only depend on stable values, not changeImpact object (causes infinite loop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order, form, initialData]);

  const performSave = async (data: PurchaseOrderFormData) => {
    setLoading(true);

    try {
      const cleanData: Record<string, unknown> = {
        ...data,
        notes: data.notes || null,
      };

      // Optimistic locking: send updatedAt timestamp for conflict detection
      if (isEditing && order?.updatedAt) {
        cleanData.expectedUpdatedAt = new Date(order.updatedAt).toISOString();
      }

      const url = isEditing ? `/api/purchase-orders/${order!.id}` : '/api/purchase-orders';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle 409 Conflict (optimistic locking)
        if (response.status === 409) {
          toast.error('Dữ liệu đã bị thay đổi bởi người dùng khác. Vui lòng đóng form và thử lại.');
          return;
        }
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            form.setError(field as keyof PurchaseOrderFormData, {
              type: 'server',
              message: (messages as string[]).join(', '),
            });
          });
          return;
        }
        throw new Error(result.message || result.error || t('form.error'));
      }

      toast.success(isEditing ? t('poForm.updateSuccess') : t('poForm.createSuccess'));
      onSuccess?.(result.data || result);
      onOpenChange(false);
    } catch (error) {
      clientLogger.error('Failed to save PO', error);
      toast.error(error instanceof Error ? error.message : t('form.error'));
    } finally {
      setLoading(false);
      setPendingSubmitData(null);
    }
  };

  const onSubmit = async (data: PurchaseOrderFormData) => {
    if (!isEditing || !order?.id || !originalValuesRef.current) {
      performSave(data);
      return;
    }

    const changes = detectChanges(
      originalValuesRef.current,
      data as unknown as Record<string, unknown>,
      PO_IMPACT_FIELDS
    );

    if (changes.length === 0) {
      performSave(data);
      return;
    }

    setPendingSubmitData(data);
    await changeImpact.checkImpact('purchaseOrder', order.id, changes);
  };

  const addLine = () => {
    append({ partId: '', quantity: 1, unitPrice: 0 });
  };

  const calculateTotal = () => {
    const lines = form.watch('lines') || [];
    return lines.reduce((sum, line) => sum + (line.quantity || 0) * (line.unitPrice || 0), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {isEditing ? t('poForm.editTitle') : t('poForm.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('poForm.editDesc') : t('poForm.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('poForm.poNumber')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Tự động (PO-2026-001)" {...field} disabled={isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('poForm.supplier')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('poForm.selectSupplier')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.code} - {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('poForm.orderDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('poForm.expectedDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">{t('status.draft')}</SelectItem>
                        <SelectItem value="pending">{t('status.pending')}</SelectItem>
                        <SelectItem value="confirmed">{t('status.confirmed')}</SelectItem>
                        <SelectItem value="in_progress">{t('status.inProgress')}</SelectItem>
                        <SelectItem value="received">{t('status.received')}</SelectItem>
                        <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('poForm.currency')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="VND">VND</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.notes')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('poForm.notesPlaceholder')} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PO Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('poForm.poDetails')}</h4>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('form.addLine')}
                </Button>
              </div>

              {fields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">{t('poForm.part')}</TableHead>
                      <TableHead className="w-[20%]">{t('poForm.quantity')}</TableHead>
                      <TableHead className="w-[20%]">{t('poForm.unitPrice')}</TableHead>
                      <TableHead className="w-[15%] text-right">{t('poForm.lineTotal')}</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const quantity = form.watch(`lines.${index}.quantity`) || 0;
                      const unitPrice = form.watch(`lines.${index}.unitPrice`) || 0;
                      const lineTotal = quantity * unitPrice;

                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`lines.${index}.partId`}
                              render={({ field }) => (
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    const part = parts.find((p) => p.id === value);
                                    if (part) {
                                      form.setValue(`lines.${index}.unitPrice`, part.unitCost);
                                    }
                                  }}
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('poForm.selectPart')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {parts.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.partNumber} - {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`lines.${index}.quantity`}
                              render={({ field }) => (
                                <NumberInput
                                  min={1}
                                  emptyValue={1}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`lines.${index}.unitPrice`}
                              render={({ field }) => (
                                <NumberInput
                                  min={0}
                                  allowDecimal={true}
                                  emptyValue={0}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              aria-label="Xóa dòng"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        {t('form.total')}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  {t('poForm.noItems')}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || changeImpact.loading}>
                {t('form.cancel')}
              </Button>
              <Button type="submit" disabled={loading || changeImpact.loading}>
                {(loading || changeImpact.loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('form.save') : t('poForm.createBtn')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Change Impact Dialog */}
      <ChangeImpactDialog
        open={changeImpact.showDialog}
        onOpenChange={changeImpact.setShowDialog}
        result={changeImpact.result}
        loading={changeImpact.loading}
        onConfirm={changeImpact.confirm}
        onCancel={changeImpact.cancel}
      />
    </Dialog>
  );
}

// =============================================================================
// DELETE DIALOG
// =============================================================================

interface DeletePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder | null;
  onSuccess?: () => void;
}

export function DeletePurchaseOrderDialog({ open, onOpenChange, order, onSuccess }: DeletePurchaseOrderDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!order) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || t('form.error'));
      }

      toast.success(result.deleted ? t('poForm.deleteSuccess') : t('poForm.cancelSuccess'));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      clientLogger.error('Failed to delete PO', error);
      toast.error(error instanceof Error ? error.message : t('form.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('form.confirmDeleteCancel')}</DialogTitle>
          <DialogDescription>
            {order?.status === 'draft'
              ? t('poForm.deleteConfirmDraft', { poNumber: order?.poNumber || '' })
              : t('poForm.cancelConfirm', { poNumber: order?.poNumber || '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('form.no')}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {order?.status === 'draft' ? t('form.delete') : t('poForm.cancelBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PurchaseOrderForm;
