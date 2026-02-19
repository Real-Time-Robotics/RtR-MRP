'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { useLanguage } from '@/lib/i18n/language-context';
import {
  ChangeImpactDialog,
  useChangeImpact,
  detectChanges,
} from '@/components/change-impact';
import { FieldChange } from '@/lib/change-impact/types';
import { useMutation } from '@/hooks/use-mutation';

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const supplierSchema = z.object({
  code: z.string().min(1, 'Mã nhà cung cấp là bắt buộc').max(20),
  name: z.string().min(1, 'Tên nhà cung cấp là bắt buộc').max(200),
  country: z.string().min(1, 'Quốc gia là bắt buộc'),
  ndaaCompliant: z.boolean(),
  contactName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  paymentTerms: z.string().max(50).optional().nullable(),
  leadTimeDays: z.number().int().min(0, 'Lead time phải >= 0'),
  rating: z.number().min(0).max(5).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive', 'pending']),
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

// Field config for change impact detection
const SUPPLIER_IMPACT_FIELDS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  leadTimeDays: { label: 'Lead Time (days)', valueType: 'number' },
  status: { label: 'Status', valueType: 'string' },
  paymentTerms: { label: 'Payment Terms', valueType: 'string' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function SupplierForm({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: SupplierFormProps) {
  const { t } = useLanguage();
  const isEditing = !!supplier;

  // Store original values for change impact detection
  const originalValuesRef = useRef<Record<string, unknown> | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<SupplierFormData | null>(null);

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
      leadTimeDays: 0,
      rating: null,
      category: '',
      status: 'active',
    },
  });

  const mutation = useMutation<SupplierFormData, Supplier>({
    url: isEditing ? `/api/suppliers/${supplier!.id}` : '/api/suppliers',
    method: isEditing ? 'PUT' : 'POST',
    setError: form.setError,
    revalidateKeys: ['/api/suppliers'],
    successMessage: isEditing ? t('supplierForm.updateSuccess') : t('supplierForm.createSuccess'),
    onSuccess: (data) => { onSuccess?.(data); onOpenChange(false); },
    transformData: (data) => ({
      ...data,
      contactName: data.contactName || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      address: data.address || null,
      category: data.category || null,
    }),
  });

  // Change Impact hook
  const changeImpact = useChangeImpact({
    onSuccess: () => {
      if (pendingSubmitData) {
        mutation.mutate(pendingSubmitData);
      }
    },
    onError: () => {
      if (pendingSubmitData) {
        mutation.mutate(pendingSubmitData);
      }
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
        // Store original values for change impact
        originalValuesRef.current = {
          leadTimeDays: supplier.leadTimeDays,
          status: supplier.status,
          paymentTerms: supplier.paymentTerms,
        };
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
          leadTimeDays: 0,
          rating: null,
          category: '',
          status: 'active',
        });
        originalValuesRef.current = null;
      }
      // Reset change impact state
      changeImpact.reset();
      setPendingSubmitData(null);
    }
  // Note: Only depend on stable values, not changeImpact object (causes infinite loop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier, form]);

  // Handle submit with change impact check
  const onSubmit = async (data: SupplierFormData) => {
    if (!isEditing || !supplier?.id || !originalValuesRef.current) {
      mutation.mutate(data);
      return;
    }

    const changes = detectChanges(
      originalValuesRef.current,
      data as unknown as Record<string, unknown>,
      SUPPLIER_IMPACT_FIELDS
    );

    if (changes.length === 0) {
      mutation.mutate(data);
      return;
    }

    setPendingSubmitData(data);
    await changeImpact.checkImpact('supplier', supplier.id, changes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {isEditing ? t('supplierForm.editTitle') : t('supplierForm.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('supplierForm.editDesc')
              : t('supplierForm.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                {t('supplierForm.basicInfo')}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('supplierForm.code')}</FormLabel>
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
                    <FormLabel>{t('supplierForm.name')}</FormLabel>
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
                      <FormLabel>{t('supplierForm.country')}</FormLabel>
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
                      <FormLabel>{t('supplierForm.category')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('supplierForm.selectCategory')} />
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
                {t('supplierForm.contactInfo')}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('supplierForm.contactName')}</FormLabel>
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
                      <FormLabel>{t('supplierForm.contactPhone')}</FormLabel>
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
                    <FormLabel>{t('supplierForm.contactEmail')}</FormLabel>
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
                    <FormLabel>{t('supplierForm.address')}</FormLabel>
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
                {t('supplierForm.businessTerms')}
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('supplierForm.paymentTerms')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('form.selectPlaceholder')} />
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
                      <FormLabel>{t('supplierForm.leadTimeDays')}</FormLabel>
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
                      <FormLabel>{t('supplierForm.rating')}</FormLabel>
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
                      <FormLabel className="text-base">{t('supplierForm.ndaaCompliant')}</FormLabel>
                      <FormDescription>
                        {t('supplierForm.ndaaDesc')}
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
                disabled={mutation.isLoading || changeImpact.loading}
              >
                {t('form.cancel')}
              </Button>
              <Button type="submit" disabled={mutation.isLoading || changeImpact.loading}>
                {(mutation.isLoading || changeImpact.loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('form.save') : t('supplierForm.createBtn')}
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
  const { t } = useLanguage();

  const deleteMutation = useMutation({
    url: `/api/suppliers/${supplier?.id}`,
    method: 'DELETE',
    revalidateKeys: ['/api/suppliers'],
    successMessage: t('supplierForm.deleteSuccess'),
    onSuccess: () => { onSuccess?.(); onOpenChange(false); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('form.confirmDelete')}</DialogTitle>
          <DialogDescription>
            {t('supplierForm.deleteConfirmDesc', { name: supplier?.name || '', code: supplier?.code || '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isLoading}
          >
            {t('form.cancel')}
          </Button>
          <Button variant="destructive" onClick={() => supplier && deleteMutation.mutate()} disabled={deleteMutation.isLoading}>
            {deleteMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('form.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupplierForm;
