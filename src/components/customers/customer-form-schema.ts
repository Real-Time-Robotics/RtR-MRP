import { z } from 'zod';

export const CUSTOMER_TYPES = ['Enterprise', 'Government', 'SMB', 'Distributor', 'Retail', 'Other'];
export const PAYMENT_TERMS = ['Net 30', 'Net 45', 'Net 60', 'Net 90', 'COD', 'Prepaid'];

export const customerSchema = z.object({
    code: z.string().min(1, 'Mã khách hàng là bắt buộc').max(20),
    name: z.string().min(1, 'Tên khách hàng là bắt buộc').max(200),
    type: z.string().max(50).optional().nullable(),
    country: z.string().max(50).optional().nullable(),
    contactName: z.string().max(100).optional().nullable(),
    contactEmail: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
    contactPhone: z.string().max(20).optional().nullable(),
    billingAddress: z.string().max(500).optional().nullable(),
    paymentTerms: z.string().max(50).optional().nullable(),
    creditLimit: z.union([
        z.number().min(0),
        z.null(),
        z.undefined()
    ]).transform(val => val ?? null).optional(),
    status: z.enum(['active', 'inactive', 'pending']),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export const defaultCustomerValues: CustomerFormData = {
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
};
