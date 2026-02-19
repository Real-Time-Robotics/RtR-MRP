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
import { Loader2, ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  ChangeImpactDialog,
  useChangeImpact,
  detectChanges,
} from '@/components/change-impact';
import { FieldChange } from '@/lib/change-impact/types';
import { useLanguage } from '@/lib/i18n/language-context';
import { useMutation } from '@/hooks/use-mutation';

// =============================================================================
// CHANGE IMPACT CONFIGURATION
// =============================================================================

const SO_IMPACT_FIELDS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  status: { label: 'Status', valueType: 'string' },
  priority: { label: 'Priority', valueType: 'string' },
};

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const orderLineSchema = z.object({
  productId: z.string().min(1, 'Sản phẩm là bắt buộc'),
  quantity: z.number().int().min(1, 'Số lượng >= 1'),
  unitPrice: z.number().min(0, 'Giá >= 0'),
});

const salesOrderSchema = z.object({
  orderNumber: z.string().min(1, 'Số đơn hàng là bắt buộc').max(50),
  customerId: z.string().min(1, 'Khách hàng là bắt buộc'),
  orderDate: z.string().min(1, 'Ngày đặt hàng là bắt buộc'),
  requiredDate: z.string().min(1, 'Ngày yêu cầu là bắt buộc'),
  promisedDate: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  status: z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().max(1000).optional().nullable(),
  lines: z.array(orderLineSchema).optional(),
});

type SalesOrderFormData = z.infer<typeof salesOrderSchema>;

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  orderDate: string | Date;
  requiredDate: string | Date;
  promisedDate?: string | Date | null;
  priority: string;
  status: string;
  totalAmount?: number;
  notes?: string | null;
  customer?: { id: string; code: string; name: string };
  lines?: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    shippedQty?: number;
    product?: { id: string; sku: string; name: string };
  }>;
}

interface Customer {
  id: string;
  code: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  basePrice: number | null;
}

interface SalesOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: SalesOrder | null;
  onSuccess?: (order: SalesOrder) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SalesOrderForm({ open, onOpenChange, order, onSuccess }: SalesOrderFormProps) {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const isEditing = !!order;

  // Change Impact state
  const originalValuesRef = useRef<Record<string, unknown> | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<SalesOrderFormData | null>(null);

  const form = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      orderNumber: '',
      customerId: '',
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      requiredDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      promisedDate: '',
      priority: 'normal',
      status: 'draft',
      notes: '',
      lines: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  // Fetch customers and products
  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchProducts();
    }
  }, [open]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const result = await res.json();
        setCustomers(result.data || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch customers', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?pageSize=100');
      if (res.ok) {
        const result = await res.json();
        setProducts(result.data || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch products', error);
    }
  };

  useEffect(() => {
    if (open) {
      if (order) {
        form.reset({
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          orderDate: format(new Date(order.orderDate), 'yyyy-MM-dd'),
          requiredDate: format(new Date(order.requiredDate), 'yyyy-MM-dd'),
          promisedDate: order.promisedDate ? format(new Date(order.promisedDate), 'yyyy-MM-dd') : '',
          priority: order.priority as SalesOrderFormData['priority'],
          status: order.status as SalesOrderFormData['status'],
          notes: order.notes || '',
          lines: order.lines?.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })) || [],
        });
      } else {
        form.reset({
          orderNumber: `SO-${Date.now().toString().slice(-6)}`,
          customerId: '',
          orderDate: format(new Date(), 'yyyy-MM-dd'),
          requiredDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          promisedDate: '',
          priority: 'normal',
          status: 'draft',
          notes: '',
          lines: [],
        });
      }
    }
    // Store original values for Change Impact when editing
    if (order) {
      originalValuesRef.current = {
        status: order.status,
        priority: order.priority,
      };
    } else {
      originalValuesRef.current = null;
    }
  }, [open, order, form]);

  const mutation = useMutation<SalesOrderFormData, SalesOrder>({
    url: isEditing ? `/api/sales-orders/${order!.id}` : '/api/sales-orders',
    method: isEditing ? 'PUT' : 'POST',
    setError: form.setError,
    revalidateKeys: ['/api/sales-orders'],
    successMessage: isEditing ? t('soForm.updateSuccess') : t('soForm.createSuccess'),
    onSuccess: (data) => { onSuccess?.(data); onOpenChange(false); },
    transformData: (data) => ({
      ...data,
      promisedDate: data.promisedDate || null,
      notes: data.notes || null,
    }),
  });

  // Change Impact hook
  const changeImpact = useChangeImpact({
    onSuccess: () => {
      if (pendingSubmitData) {
        mutation.mutate(pendingSubmitData);
        setPendingSubmitData(null);
      }
    },
    onError: () => {
      if (pendingSubmitData) {
        mutation.mutate(pendingSubmitData);
        setPendingSubmitData(null);
      }
    },
  });

  const onSubmit = async (data: SalesOrderFormData) => {
    if (isEditing && order && originalValuesRef.current) {
      const changes = detectChanges(
        originalValuesRef.current,
        { status: data.status, priority: data.priority },
        SO_IMPACT_FIELDS
      );

      if (changes.length > 0) {
        setPendingSubmitData(data);
        changeImpact.checkImpact('salesOrder', order.id, changes);
        return;
      }
    }

    mutation.mutate(data);
  };

  const addLine = () => {
    append({ productId: '', quantity: 1, unitPrice: 0 });
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
            <ShoppingCart className="h-5 w-5" />
            {isEditing ? t('soForm.editTitle') : t('soForm.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('soForm.editDesc') : t('soForm.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('soForm.orderNumber')}</FormLabel>
                    <FormControl>
                      <Input placeholder="SO-001" {...field} disabled={isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('soForm.customer')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('soForm.selectCustomer')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.code} - {c.name}
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
                    <FormLabel>{t('soForm.orderDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('soForm.requiredDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promisedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('soForm.promisedDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('soForm.priority')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t('priority.low')}</SelectItem>
                        <SelectItem value="normal">{t('priority.normal')}</SelectItem>
                        <SelectItem value="high">{t('priority.high')}</SelectItem>
                        <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="completed">{t('status.completed')}</SelectItem>
                        <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.notes')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('form.notesPlaceholder')} {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('soForm.orderDetails')}</h4>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('form.addLine')}
                </Button>
              </div>

              {fields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">{t('soForm.product')}</TableHead>
                      <TableHead className="w-[20%]">{t('soForm.quantity')}</TableHead>
                      <TableHead className="w-[20%]">{t('soForm.unitPrice')}</TableHead>
                      <TableHead className="w-[15%] text-right">{t('soForm.lineTotal')}</TableHead>
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
                              name={`lines.${index}.productId`}
                              render={({ field }) => (
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    const product = products.find((p) => p.id === value);
                                    if (product) {
                                      form.setValue(`lines.${index}.unitPrice`, product.basePrice || 0);
                                    }
                                  }}
                                  defaultValue=""
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('soForm.selectProduct')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.sku} - {p.name}
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
                  {t('soForm.noProducts')}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isLoading}>
                {t('form.cancel')}
              </Button>
              <Button type="submit" disabled={mutation.isLoading}>
                {mutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('form.save') : t('soForm.createBtn')}
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
        onCancel={() => {
          changeImpact.cancel();
          setPendingSubmitData(null);
        }}
      />
    </Dialog>
  );
}

// =============================================================================
// DELETE DIALOG
// =============================================================================

interface DeleteSalesOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SalesOrder | null;
  onSuccess?: () => void;
}

export function DeleteSalesOrderDialog({ open, onOpenChange, order, onSuccess }: DeleteSalesOrderDialogProps) {
  const { t } = useLanguage();

  const deleteMutation = useMutation({
    url: `/api/sales-orders/${order?.id}`,
    method: 'DELETE',
    revalidateKeys: ['/api/sales-orders'],
    successMessage: order?.status === 'draft' ? t('soForm.deleteSuccess') : t('soForm.cancelSuccess'),
    onSuccess: () => { onSuccess?.(); onOpenChange(false); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('soForm.deleteConfirmTitle')}</DialogTitle>
          <DialogDescription>
            {order?.status === 'draft' ? (
              t('soForm.deleteConfirmDraft', { orderNumber: order?.orderNumber || '' })
            ) : (
              t('soForm.cancelConfirm', { orderNumber: order?.orderNumber || '' })
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isLoading}>
            {t('form.no')}
          </Button>
          <Button variant="destructive" onClick={() => order && deleteMutation.mutate()} disabled={deleteMutation.isLoading}>
            {deleteMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {order?.status === 'draft' ? t('form.delete') : t('soForm.cancelBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SalesOrderForm;
