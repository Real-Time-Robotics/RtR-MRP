'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChangeImpactDialog,
  useChangeImpact,
  detectChanges,
} from '@/components/change-impact';
import { FieldChange } from '@/lib/change-impact/types';
import { useMutation } from '@/hooks/use-mutation';
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
import { useLanguage } from '@/lib/i18n/language-context';

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
  creditLimit: z.number().min(0).optional().nullable(),
  status: z.enum(['active', 'inactive', 'pending']),
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
// CHANGE IMPACT CONFIGURATION
// =============================================================================

const CUSTOMER_IMPACT_FIELDS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  status: { label: 'Trạng thái', valueType: 'string' },
  creditLimit: { label: 'Hạn mức tín dụng', valueType: 'currency' },
  paymentTerms: { label: 'Điều khoản thanh toán', valueType: 'string' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function CustomerForm({ open, onOpenChange, customer, onSuccess }: CustomerFormProps) {
  const { t } = useLanguage();
  const isEditing = !!customer;

  // Change Impact state
  const originalValuesRef = useRef<Record<string, unknown> | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<CustomerFormData | null>(null);

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

  const mutation = useMutation<CustomerFormData, Customer>({
    url: isEditing ? `/api/customers/${customer!.id}` : '/api/customers',
    method: isEditing ? 'PUT' : 'POST',
    setError: form.setError,
    revalidateKeys: ['/api/customers'],
    successMessage: isEditing ? t('customerForm.updateSuccess') : t('customerForm.createSuccess'),
    onSuccess: (data) => { onSuccess?.(data); onOpenChange(false); },
    transformData: (data) => ({
      ...data,
      contactEmail: data.contactEmail || null,
      type: data.type || null,
      country: data.country || null,
    }),
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

        // Store original values for Change Impact
        originalValuesRef.current = {
          status: customer.status,
          creditLimit: customer.creditLimit,
          paymentTerms: customer.paymentTerms,
        };
      } else {
        originalValuesRef.current = null;
        form.reset();
      }
    }
  }, [open, customer, form]);

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

  const onSubmit = async (data: CustomerFormData) => {
    // Only check impact when editing and there are tracked changes
    if (isEditing && customer && originalValuesRef.current) {
      const newValues = {
        status: data.status,
        creditLimit: data.creditLimit,
        paymentTerms: data.paymentTerms,
      };

      const changes = detectChanges(
        originalValuesRef.current,
        newValues,
        CUSTOMER_IMPACT_FIELDS
      );

      if (changes.length > 0) {
        setPendingSubmitData(data);
        changeImpact.checkImpact('customer', customer.id, changes);
        return;
      }
    }

    // No tracked changes or new record - save directly
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isEditing ? t('customerForm.editTitle') : t('customerForm.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('customerForm.editDesc') : t('customerForm.addDesc')}
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
                    <FormLabel>{t('customerForm.code')}</FormLabel>
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
                    <FormLabel>{t('form.status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t('status.active')}</SelectItem>
                        <SelectItem value="inactive">{t('status.inactiveShort')}</SelectItem>
                        <SelectItem value="pending">{t('status.approval')}</SelectItem>
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
                  <FormLabel>{t('customerForm.name')}</FormLabel>
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
                    <FormLabel>{t('customerForm.type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('customerForm.selectType')} />
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
                    <FormLabel>{t('customerForm.country')}</FormLabel>
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
                    <FormLabel>{t('customerForm.contactName')}</FormLabel>
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
                    <FormLabel>{t('customerForm.contactPhone')}</FormLabel>
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
                  <FormLabel>{t('customerForm.contactEmail')}</FormLabel>
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
                  <FormLabel>{t('customerForm.billingAddress')}</FormLabel>
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
                    <FormLabel>{t('customerForm.paymentTerms')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('form.selectPlaceholder')} />
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
                    <FormLabel>{t('customerForm.creditLimit')}</FormLabel>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isLoading}>
                {t('form.cancel')}
              </Button>
              <Button type="submit" disabled={mutation.isLoading}>
                {mutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('form.save') : t('customerForm.createBtn')}
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

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess?: () => void;
}

export function DeleteCustomerDialog({ open, onOpenChange, customer, onSuccess }: DeleteCustomerDialogProps) {
  const { t } = useLanguage();

  const deleteMutation = useMutation({
    url: `/api/customers/${customer?.id}`,
    method: 'DELETE',
    revalidateKeys: ['/api/customers'],
    successMessage: t('customerForm.deleteSuccess'),
    onSuccess: () => { onSuccess?.(); onOpenChange(false); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('form.confirmDelete')}</DialogTitle>
          <DialogDescription>
            {t('form.deleteConfirmSimple', { itemType: t('customers.pageTitle'), name: customer?.name || '', code: customer?.code || '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isLoading}>{t('form.cancel')}</Button>
          <Button variant="destructive" onClick={() => customer && deleteMutation.mutate()} disabled={deleteMutation.isLoading}>
            {deleteMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('form.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerForm;
