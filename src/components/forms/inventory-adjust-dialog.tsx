'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

const ADJUSTMENT_REASONS = [
  'Điều chỉnh tồn kho',
  'Kiểm kê định kỳ',
  'Hàng hư hỏng',
  'Hàng hết hạn',
  'Nhập kho bổ sung',
  'Xuất kho nội bộ',
  'Sai số liệu',
  'Khác',
];

// =============================================================================
// COMPONENT
// =============================================================================

export function InventoryAdjustDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryAdjustDialogProps) {
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeTab, setActiveTab] = useState<'adjust' | 'transfer'>('adjust');

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
      console.error('Failed to fetch parts:', error);
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
      console.error('Failed to fetch warehouses:', error);
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
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success('Điều chỉnh tồn kho thành công!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to adjust inventory:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const onTransferSubmit = async (data: TransferFormData) => {
    if (data.fromWarehouseId === data.toWarehouseId) {
      transferForm.setError('toWarehouseId', {
        type: 'manual',
        message: 'Kho đích phải khác kho nguồn',
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
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success('Chuyển kho thành công!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to transfer inventory:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
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
            Điều chỉnh tồn kho
          </DialogTitle>
          <DialogDescription>
            {inventoryItem
              ? `Điều chỉnh cho ${inventoryItem.partNumber} - ${inventoryItem.name}`
              : 'Điều chỉnh hoặc chuyển kho cho part'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'adjust' | 'transfer')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="adjust" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              Điều chỉnh
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex items-center gap-1">
              <ArrowRightLeft className="h-4 w-4" />
              Chuyển kho
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
                        <FormLabel>Part *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!inventoryItem}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn part" />
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
                        <FormLabel>Kho *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!inventoryItem}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn kho" />
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
                      <FormLabel>Loại điều chỉnh</FormLabel>
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
                              Cộng thêm
                            </span>
                          </SelectItem>
                          <SelectItem value="subtract">
                            <span className="flex items-center gap-2">
                              <Minus className="h-4 w-4 text-red-600" />
                              Trừ bớt
                            </span>
                          </SelectItem>
                          <SelectItem value="set">
                            <span className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-blue-600" />
                              Đặt giá trị
                            </span>
                          </SelectItem>
                          <SelectItem value="cycle_count">
                            <span className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-purple-600" />
                              Kiểm kê
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {adjustForm.watch('adjustmentType') === 'add' && 'Cộng thêm số lượng vào tồn kho'}
                        {adjustForm.watch('adjustmentType') === 'subtract' && 'Trừ bớt số lượng từ tồn kho'}
                        {adjustForm.watch('adjustmentType') === 'set' && 'Đặt số lượng tồn kho về giá trị cụ thể'}
                        {adjustForm.watch('adjustmentType') === 'cycle_count' && 'Cập nhật số lượng theo kết quả kiểm kê'}
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
                      <FormLabel>Số lượng *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      {inventoryItem && (
                        <FormDescription>
                          Tồn kho hiện tại: {inventoryItem.quantity}
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
                      <FormLabel>Lý do *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn lý do" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ADJUSTMENT_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
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
                      <FormLabel>Mã tham chiếu</FormLabel>
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
                      <FormLabel>Ghi chú</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ghi chú thêm..." {...field} />
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
                    Hủy
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Điều chỉnh
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
                      <FormLabel>Part *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!inventoryItem}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn part" />
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
                        <FormLabel>Từ kho *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!inventoryItem}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Kho nguồn" />
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
                        <FormLabel>Đến kho *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Kho đích" />
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
                      <FormLabel>Số lượng chuyển *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      {inventoryItem && (
                        <FormDescription>
                          Tồn kho tại kho nguồn: {inventoryItem.quantity}
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
                      <FormLabel>Lý do chuyển</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Lý do chuyển kho..." {...field} />
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
                    Hủy
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Chuyển kho
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
