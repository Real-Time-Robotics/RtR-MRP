'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  poNumber: z.string().min(1, 'Số PO là bắt buộc').max(50),
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

  // Fetch suppliers and parts
  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchParts();
    }
  }, [open]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers?status=active');
      if (res.ok) {
        const result = await res.json();
        setSuppliers(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchParts = async () => {
    try {
      const res = await fetch('/api/parts?makeOrBuy=BUY');
      if (res.ok) {
        const result = await res.json();
        setParts(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch parts:', error);
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
          poNumber: `PO-${Date.now().toString().slice(-6)}`,
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
      const cleanData = {
        ...data,
        notes: data.notes || null,
      };

      const url = isEditing ? `/api/purchase-orders/${order!.id}` : '/api/purchase-orders';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            form.setError(field as keyof PurchaseOrderFormData, {
              type: 'server',
              message: (messages as string[]).join(', '),
            });
          });
          return;
        }
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success(isEditing ? 'Cập nhật PO thành công!' : 'Tạo PO thành công!');
      onSuccess?.(result.data || result);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save PO:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
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
            {isEditing ? 'Chỉnh sửa PO' : 'Tạo PO mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Cập nhật thông tin đơn mua hàng' : 'Điền thông tin để tạo đơn mua hàng mới'}
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
                    <FormLabel>Số PO *</FormLabel>
                    <FormControl>
                      <Input placeholder="PO-001" {...field} disabled={isEditing} />
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
                    <FormLabel>Nhà cung cấp *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn nhà cung cấp" />
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
                    <FormLabel>Ngày đặt *</FormLabel>
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
                    <FormLabel>Ngày dự kiến *</FormLabel>
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
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Nháp</SelectItem>
                        <SelectItem value="pending">Chờ xử lý</SelectItem>
                        <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                        <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                        <SelectItem value="received">Đã nhận</SelectItem>
                        <SelectItem value="cancelled">Đã hủy</SelectItem>
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
                    <FormLabel>Tiền tệ</FormLabel>
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
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ghi chú cho PO..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PO Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Chi tiết PO</h4>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm dòng
                </Button>
              </div>

              {fields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Part</TableHead>
                      <TableHead className="w-[20%]">Số lượng</TableHead>
                      <TableHead className="w-[20%]">Đơn giá</TableHead>
                      <TableHead className="w-[15%] text-right">Thành tiền</TableHead>
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
                                    <SelectValue placeholder="Chọn part" />
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
                                <Input
                                  type="number"
                                  min={1}
                                  value={field.value ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    field.onChange(val === '' ? 1 : parseInt(val, 10) || 1);
                                  }}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`lines.${index}.unitPrice`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={field.value ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    field.onChange(val === '' ? 0 : parseFloat(val) || 0);
                                  }}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
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
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        Tổng cộng:
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
                  Chưa có item nào. Nhấn "Thêm dòng" để thêm parts.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || changeImpact.loading}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading || changeImpact.loading}>
                {(loading || changeImpact.loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Lưu thay đổi' : 'Tạo PO'}
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
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!order) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success(result.deleted ? 'Đã xóa PO!' : 'Đã hủy PO!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete PO:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xóa/hủy</DialogTitle>
          <DialogDescription>
            {order?.status === 'draft' ? (
              <>Bạn có chắc chắn muốn <strong>xóa</strong> PO <strong>{order?.poNumber}</strong>?</>
            ) : (
              <>Bạn có chắc chắn muốn <strong>hủy</strong> PO <strong>{order?.poNumber}</strong>?</>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Không
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {order?.status === 'draft' ? 'Xóa' : 'Hủy PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PurchaseOrderForm;
