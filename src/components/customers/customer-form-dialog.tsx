'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { User, Mail, Phone, CreditCard } from 'lucide-react';
import { useDataEntry } from '@/hooks/use-data-entry';
import { FormModal } from '@/components/ui-v2/form-modal';
import {
    customerSchema,
    CustomerFormData,
    defaultCustomerValues,
    CUSTOMER_TYPES,
    PAYMENT_TERMS,
} from './customer-form-schema';
import { Customer } from '@/components/forms/customer-form'; // Import type primarily
import type { Resolver } from 'react-hook-form';

interface CustomerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: Customer | null;
    onSuccess?: () => void;
}

export function CustomerFormDialog({
    open,
    onOpenChange,
    customer,
    onSuccess,
}: CustomerFormDialogProps) {
    const isEditing = !!customer;

    const form = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema) as Resolver<CustomerFormData>,
        defaultValues: defaultCustomerValues,
    });

    // Reset form when dialog opens/closes or customer changes
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
                form.reset(defaultCustomerValues);
            }
        }
    }, [open, customer, form]);

    const { submit, isSubmitting } = useDataEntry<CustomerFormData>({
        onSubmit: async (data) => {
            // Clean up empty strings to null
            const cleanData = {
                ...data,
                contactEmail: data.contactEmail || null,
                type: data.type || null,
                country: data.country || null,
                contactName: data.contactName || null,
                contactPhone: data.contactPhone || null,
                billingAddress: data.billingAddress || null,
                paymentTerms: data.paymentTerms || null,
                creditLimit: data.creditLimit ? Number(data.creditLimit) : null,
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
                    // Validation errors
                    const errors = result.errors as Record<string, string[]>;
                    (Object.keys(errors) as Array<keyof CustomerFormData>).forEach((field) => {
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
        successMessage: isEditing ? 'Cập nhật khách hàng thành công!' : 'Tạo khách hàng thành công!',
    });

    return (
        <FormModal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={isEditing ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
            description={isEditing ? 'Cập nhật thông tin khách hàng' : 'Điền thông tin để tạo khách hàng mới'}
            isSubmitting={isSubmitting}
            onSubmit={form.handleSubmit(submit)}
            maxWidth="2xl"
        >
            <Form {...form}>
                <form className="space-y-6">
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
                    </div>

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
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 border-b pb-2">
                            Tài chính
                        </h4>
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
                    </div>
                </form>
            </Form>
        </FormModal>
    );
}
