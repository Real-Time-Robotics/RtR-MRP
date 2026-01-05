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
import { Loader2, Users, User, Mail, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const customerSchema = z.object({
  code: z.string().min(1, 'Mã khách hàng là bắt buộc').max(20),
  name: z.string().min(1, 'Tên khách hàng là bắt buộc').max(200),
  type: z.string().max(50).optional().nullable(),
  country: z.string().max(50).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(20).optional().nullable(),
  billingAddress: z.string().max(500).optional().nullable(),
  paymentTerms: z.string().max(50).optional().nullable(),
  creditLimit: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export interface Customer {
  id: string;
  code: string;
  name: string;
  type?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  billingAddress?: string | null;
  paymentTerms?: string | null;
  creditLimit?: number | null;
  status: string;
}

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess?: (customer: Customer) => void;
}

const CUSTOMER_TYPES = ['Enterprise', 'Government', 'SMB', 'Distributor', 'Retail', 'Other'];
const PAYMENT_TERMS = ['Net 30', 'Net 45', 'Net 60', 'Net 90', 'COD', 'Prepaid'];

// =============================================================================
// COMPONENT
// =============================================================================

export function CustomerForm({ open, onOpenChange, customer, onSuccess }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!customer;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code: '',
      name: '',
      type: '',
      country: 'Việt Nam',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      billingAddress: '',
      paymentTerms: 'Net 30',
      creditLimit: null,
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (customer) {
        form.reset({
          code: customer.code,
          name: customer.name,
          type: customer.type || '',
          country: customer.country || 'Việt Nam',
          contactName: customer.contactName || '',
          contactEmail: customer.contactEmail || '',
          contactPhone: customer.contactPhone || '',
          billingAddress: customer.billingAddress || '',
          paymentTerms: customer.paymentTerms || 'Net 30',
          creditLimit: customer.creditLimit,
          status: customer.status as 'active' | 'inactive' | 'pending',
        });
      } else {
        form.reset();
      }
    }
  }, [open, customer, form]);

  const onSubmit = async (data: CustomerFormData) => {
    setLoading(true);
    try {
      const cleanData = {
        ...data,
        contactEmail: data.contactEmail || null,
        type: data.type || null,
        country: data.country || null,
      };

      const url = isEditing ? `/api/customers/${customer.id}` : '/api/customers';
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
            form.setError(field as keyof CustomerFormData, {
              type: 'server',
              message: (messages as string[]).join(', '),
            });
          });
          return;
        }
        throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      }

      toast.success(isEditing ? 'Cập nhật khách hàng thành công!' : 'Tạo khách hàng thành công!');
      onSuccess?.(result.data);
      onOpenChange(false);
    } catch (error) {
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
            <Users className="h-5 w-5" />
            {isEditing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Cập nhật thông tin khách hàng' : 'Điền thông tin để tạo khách hàng mới'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã khách hàng *</FormLabel>
                    <FormControl>
                      <Input placeholder="CUS-001" {...field} disabled={isEditing} />
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
                        <SelectItem value="inactive">Ngưng</SelectItem>
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
                  <FormLabel>Tên khách hàng *</FormLabel>
                  <FormControl>
                    <Input placeholder="Công ty ABC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại khách hàng</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CUSTOMER_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quốc gia</FormLabel>
                    <FormControl>
                      <Input placeholder="Việt Nam" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      <Input className="pl-9" type="email" placeholder="contact@company.com" {...field} value={field.value || ''} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ thanh toán</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Đường ABC, Quận XYZ, TP.HCM" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Điều khoản thanh toán</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_TERMS.map((term) => (
                          <SelectItem key={term} value={term}>{term}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hạn mức tín dụng (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          className="pl-9"
                          type="number"
                          min={0}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Lưu thay đổi' : 'Tạo khách hàng'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// DELETE DIALOG
// =============================================================================

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess?: () => void;
}

export function DeleteCustomerDialog({ open, onOpenChange, customer, onSuccess }: DeleteCustomerDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'Có lỗi xảy ra');
      toast.success('Đã xóa khách hàng thành công!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
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
            Bạn có chắc chắn muốn xóa khách hàng <strong>{customer?.name}</strong> ({customer?.code})?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Hủy</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerForm;
