'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientLogger } from '@/lib/client-logger';
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
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Building2, MapPin, User, Mail, Phone, Clock, Star, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { useDataEntry } from '@/hooks/use-data-entry';
import { FormModal } from '@/components/ui-v2/form-modal';
import {
    supplierSchema,
    SupplierFormData,
    defaultSupplierValues,
    COUNTRIES,
    CATEGORIES,
    PAYMENT_TERMS,
} from './supplier-form-schema';
import { Supplier } from '@/components/forms/supplier-form'; // Import type primarily
import { useDebouncedCallback } from 'use-debounce';
import type { Resolver } from 'react-hook-form';

/** Extended Supplier interface with optional taxId field from API */
interface SupplierWithTaxId extends Supplier {
    taxId?: string | null;
}

interface SupplierFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier?: Supplier | null;
    onSuccess?: () => void;
}

export function SupplierFormDialog({
    open,
    onOpenChange,
    supplier,
    onSuccess,
}: SupplierFormDialogProps) {
    const isEditing = !!supplier;

    // Tax ID duplicate check state
    const [taxIdWarning, setTaxIdWarning] = useState<{ name: string; code: string } | null>(null);
    const [isCheckingTaxId, setIsCheckingTaxId] = useState(false);

    const form = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema) as Resolver<SupplierFormData>,
        defaultValues: defaultSupplierValues,
    });

    // Debounced tax ID check
    const checkTaxIdDuplicate = useDebouncedCallback(async (taxId: string) => {
        if (!taxId || taxId.trim() === '') {
            setTaxIdWarning(null);
            return;
        }

        setIsCheckingTaxId(true);
        try {
            const params = new URLSearchParams({ taxId: taxId.trim() });
            if (supplier?.id) {
                params.append('excludeId', supplier.id);
            }

            const response = await fetch(`/api/suppliers/check-tax-id?${params}`);
            const result = await response.json();

            if (result.exists && result.supplier) {
                setTaxIdWarning({ name: result.supplier.name, code: result.supplier.code });
            } else {
                setTaxIdWarning(null);
            }
        } catch (error) {
            clientLogger.error('Error checking tax ID', error);
        } finally {
            setIsCheckingTaxId(false);
        }
    }, 500);

    // Reset form when dialog opens/closes or supplier changes
    useEffect(() => {
        if (open) {
            setTaxIdWarning(null);
            if (supplier) {
                form.reset({
                    code: supplier.code,
                    name: supplier.name,
                    taxId: (supplier as SupplierWithTaxId).taxId || '',
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
                form.reset(defaultSupplierValues);
            }
        }
    }, [open, supplier, form]);

    const { submit, isSubmitting } = useDataEntry<SupplierFormData>({
        onSubmit: async (data) => {
            // Clean up empty strings to null
            const cleanData = {
                ...data,
                taxId: data.taxId || null,
                contactName: data.contactName || null,
                contactEmail: data.contactEmail || null,
                contactPhone: data.contactPhone || null,
                address: data.address || null,
                category: data.category || null,
                rating: data.rating ? Number(data.rating) : null,
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
                    const errors = result.errors as Record<string, string[]>;
                    (Object.keys(errors) as Array<keyof SupplierFormData>).forEach((field) => {
                        form.setError(field, {
                            type: 'server',
                            message: errors[field].join(', '),
                        });
                    });
                    throw new Error("Vui lòng kiểm tra lại thông tin");
                }
                throw new Error(result.message || result.error || 'Có lỗi xảy ra');
            }

            return result.data;
        },
        onSuccess: () => {
            if (onSuccess) onSuccess();
            onOpenChange(false);
        },
        successMessage: isEditing ? 'Cập nhật nhà cung cấp thành công!' : 'Tạo nhà cung cấp thành công!',
    });

    return (
        <FormModal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={isEditing ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
            description={isEditing ? 'Cập nhật thông tin nhà cung cấp' : 'Điền thông tin để tạo nhà cung cấp mới'}
            isSubmitting={isSubmitting}
            onSubmit={form.handleSubmit(submit)}
            maxWidth="2xl"
        >
            <Form {...form}>
                <form className="space-y-6">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 border-b pb-2">
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

                        <FormField
                            control={form.control}
                            name="taxId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mã số thuế</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                className="pl-9"
                                                placeholder="0123456789"
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    checkTaxIdDuplicate(e.target.value);
                                                }}
                                            />
                                            {isCheckingTaxId && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                                            )}
                                        </div>
                                    </FormControl>
                                    {taxIdWarning && (
                                        <div className="flex items-start gap-2 p-2 mt-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                                Mã số thuế này đã tồn tại cho NCC: <strong>{taxIdWarning.name}</strong> ({taxIdWarning.code})
                                            </p>
                                        </div>
                                    )}
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
                        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 border-b pb-2">
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
                        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 border-b pb-2">
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
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                                <NumberInput
                                                    className="pl-9"
                                                    min={0}
                                                    emptyValue={0}
                                                    value={field.value}
                                                    onChange={field.onChange}
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
                                                <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                                <NumberInput
                                                    className="pl-9"
                                                    min={0}
                                                    max={5}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
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
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-slate-50 dark:bg-slate-900/50">
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
                </form>
            </Form>
        </FormModal>
    );
}
