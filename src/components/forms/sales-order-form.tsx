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
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ChangeImpactDialog,
  useChangeImpact,
  detectChanges,
} from '@/components/change-impact';
import { FieldChange } from '@/lib/change-impact/types';

// =============================================================================
// CHANGE IMPACT CONFIGURATION
// =============================================================================

const SO_IMPACT_FIELDS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  status: { label: 'Trạng thái', valueType: 'string' },
  priority: { label: 'Độ ưu tiên', valueType: 'string' },
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
  const [loading, setLoading] = useState(false);
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
      console.error('Failed to fetch customers:', error);
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
      console.error('Failed to fetch products:', error);
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

  // Change Impact hook
  const changeImpact = useChangeImpact({
    onSuccess: () => {
      if (pendingSubmitData) {
        performSave(pendingSubmitData);
        setPendingSubmitData(null);
      }
    },
    onError: () => {
      // Even on error, proceed with save (impact check is informational)
      if (pendingSubmitData) {
        performSave(pendingSubmitData);
        setPendingSubmitData(null);
      }
    },
  });

  const performSave = async (data: SalesOrderFormData) => {
    setLoading(true);

    try {
      const cleanData = {
        ...data,
        promisedDate: data.promisedDate || null,
        notes: data.notes || null,
      };

      const url = isEditing ? `/api/sales-orders/${order.id}` : '/api/sales-orders';
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
            form.setError(field as keyof SalesOrderFormData, {
              type: 'server',
              message: (messages as string[]).join(', '),
            });
          });
          return;
        }
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success(isEditing ? 'Cập nhật đơn hàng thành công!' : 'Tạo đơn hàng thành công!');
      onSuccess?.(result.data || result);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SalesOrderFormData) => {
    // Only check impact when editing and there are tracked changes
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

    // No tracked changes or new record - save directly
    performSave(data);
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
            {isEditing ? 'Chỉnh sửa Đơn hàng' : 'Tạo Đơn hàng mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Cập nhật thông tin đơn hàng' : 'Điền thông tin để tạo đơn hàng mới'}
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
                    <FormLabel>Số đơn hàng *</FormLabel>
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
                    <FormLabel>Khách hàng *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn khách hàng" />
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
                    <FormLabel>Ngày đặt hàng *</FormLabel>
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
                    <FormLabel>Ngày yêu cầu *</FormLabel>
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
                    <FormLabel>Ngày cam kết</FormLabel>
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
                    <FormLabel>Ưu tiên</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Thấp</SelectItem>
                        <SelectItem value="normal">Bình thường</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                        <SelectItem value="urgent">Khẩn cấp</SelectItem>
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
                        <SelectItem value="completed">Hoàn thành</SelectItem>
                        <SelectItem value="cancelled">Đã hủy</SelectItem>
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
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ghi chú..." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Chi tiết đơn hàng</h4>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm dòng
                </Button>
              </div>

              {fields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Sản phẩm</TableHead>
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
                                    <SelectValue placeholder="Chọn sản phẩm" />
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
                  Chưa có sản phẩm nào. Nhấn "Thêm dòng" để thêm sản phẩm.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Lưu thay đổi' : 'Tạo đơn hàng'}
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
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!order) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/sales-orders/${order.id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success(result.deleted ? 'Đã xóa đơn hàng!' : 'Đã hủy đơn hàng!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete order:', error);
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
              <>Bạn có chắc chắn muốn <strong>xóa</strong> đơn hàng <strong>{order?.orderNumber}</strong>?</>
            ) : (
              <>Bạn có chắc chắn muốn <strong>hủy</strong> đơn hàng <strong>{order?.orderNumber}</strong>?</>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Không
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {order?.status === 'draft' ? 'Xóa' : 'Hủy đơn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SalesOrderForm;
