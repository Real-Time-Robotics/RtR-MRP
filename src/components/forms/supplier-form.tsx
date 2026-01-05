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
import { Switch } from '@/components/ui/switch';
import { Loader2, Building2, MapPin, User, Mail, Phone, Clock, Star } from 'lucide-react';
import { toast } from 'sonner';

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const supplierSchema = z.object({
  code: z.string().min(1, 'Mã nhà cung cấp là bắt buộc').max(20),
  name: z.string().min(1, 'Tên nhà cung cấp là bắt buộc').max(200),
  country: z.string().min(1, 'Quốc gia là bắt buộc'),
  ndaaCompliant: z.boolean().default(true),
  contactName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  paymentTerms: z.string().max(50).optional().nullable(),
  leadTimeDays: z.coerce.number().int().min(0, 'Lead time phải >= 0').default(14),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export interface Supplier {
  id: string;
  code: string;
  name: string;
  country: string;
  ndaaCompliant: boolean;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
  leadTimeDays: number;
  rating?: number | null;
  category?: string | null;
  status: string;
}

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSuccess?: (supplier: Supplier) => void;
}

const COUNTRIES = [
  'Việt Nam',
  'USA',
  'China',
  'Japan',
  'South Korea',
  'Taiwan',
  'Germany',
  'UK',
  'Singapore',
  'Thailand',
  'Malaysia',
  'Other',
];

const CATEGORIES = [
  'Electronics',
  'Mechanical',
  'Raw Materials',
  'Packaging',
  'Services',
  'Consumables',
  'Other',
];

const PAYMENT_TERMS = [
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
  'COD',
  'Prepaid',
  'LC',
];

// =============================================================================
// COMPONENT
// =============================================================================

export function SupplierForm({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: SupplierFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!supplier;

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '',
      name: '',
      country: 'Việt Nam',
      ndaaCompliant: true,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      paymentTerms: 'Net 30',
      leadTimeDays: 14,
      rating: null,
      category: '',
      status: 'active',
    },
  });

  // Reset form when dialog opens/closes or supplier changes
  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          code: supplier.code,
          name: supplier.name,
          country: supplier.country,
          ndaaCompliant: supplier.ndaaCompliant,
          contactName: supplier.contactName || '',
          contactEmail: supplier.contactEmail || '',
          contactPhone: supplier.contactPhone || '',
          address: supplier.address || '',
          paymentTerms: supplier.paymentTerms || 'Net 30',
          leadTimeDays: supplier.leadTimeDays,
          rating: supplier.rating,
          category: supplier.category || '',
          status: supplier.status as 'active' | 'inactive' | 'pending',
        });
      } else {
        form.reset({
          code: '',
          name: '',
          country: 'Việt Nam',
          ndaaCompliant: true,
          contactName: '',
          contactEmail: '',
          contactPhone: '',
          address: '',
          paymentTerms: 'Net 30',
          leadTimeDays: 14,
          rating: null,
          category: '',
          status: 'active',
        });
      }
    }
  }, [open, supplier, form]);

  const onSubmit = async (data: SupplierFormData) => {
    setLoading(true);

    try {
      // Clean up empty strings to null
      const cleanData = {
        ...data,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        address: data.address || null,
        category: data.category || null,
      };

      const url = isEditing ? `/api/suppliers/${supplier.id}` : '/api/suppliers';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          // Validation errors
          Object.entries(result.errors).forEach(([field, messages]) => {
            form.setError(field as keyof SupplierFormData, {
              type: 'server',
              message: (messages as string[]).join(', '),
            });
          });
          return;
        }
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success(isEditing ? 'Cập nhật nhà cung cấp thành công!' : 'Tạo nhà cung cấp thành công!');
      onSuccess?.(result.data);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save supplier:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditing ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Cập nhật thông tin nhà cung cấp'
              : 'Điền thông tin để tạo nhà cung cấp mới'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                Thông tin cơ bản
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã nhà cung cấp *</FormLabel>
                      <FormControl>
                        <Input placeholder="SUP-001" {...field} disabled={isEditing} />
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
                          <SelectItem value="active">Hoạt động</SelectItem>
                          <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                          <SelectItem value="pending">Chờ duyệt</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên nhà cung cấp *</FormLabel>
                    <FormControl>
                      <Input placeholder="Công ty TNHH ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quốc gia *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh mục</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                Thông tin liên hệ
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Người liên hệ</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input className="pl-9" placeholder="Nguyễn Văn A" {...field} value={field.value || ''} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số điện thoại</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input className="pl-9" placeholder="0901234567" {...field} value={field.value || ''} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          className="pl-9"
                          type="email"
                          placeholder="contact@supplier.com"
                          {...field}
                          value={field.value || ''}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Business Terms Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                Điều khoản kinh doanh
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Điều khoản thanh toán</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_TERMS.map((term) => (
                            <SelectItem key={term} value={term}>
                              {term}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadTimeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time (ngày)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            className="pl-9"
                            type="number"
                            min={0}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Đánh giá (0-5)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            className="pl-9"
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                            }
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ndaaCompliant"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">NDAA Compliant</FormLabel>
                      <FormDescription>
                        Nhà cung cấp tuân thủ quy định NDAA (Section 889)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
                {isEditing ? 'Lưu thay đổi' : 'Tạo nhà cung cấp'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// DELETE CONFIRMATION DIALOG
// =============================================================================

interface DeleteSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSuccess?: () => void;
}

export function DeleteSupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: DeleteSupplierDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!supplier) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success('Đã xóa nhà cung cấp thành công!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa nhà cung cấp{' '}
            <strong>{supplier?.name}</strong> ({supplier?.code})? Hành động này
            không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupplierForm;
