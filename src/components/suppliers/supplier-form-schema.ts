import { z } from 'zod';

export const COUNTRIES = [
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

export const CATEGORIES = [
    'Electronics',
    'Mechanical',
    'Raw Materials',
    'Packaging',
    'Services',
    'Consumables',
    'Other',
];

export const PAYMENT_TERMS = [
    'Net 30',
    'Net 45',
    'Net 60',
    'Net 90',
    'COD',
    'Prepaid',
    'LC',
];

export const supplierSchema = z.object({
    code: z.string().min(1, 'Mã nhà cung cấp là bắt buộc').max(20),
    name: z.string().min(1, 'Tên nhà cung cấp là bắt buộc').max(200),
    taxId: z.string().max(20, 'Mã số thuế tối đa 20 ký tự').optional().nullable(),
    country: z.string().min(1, 'Quốc gia là bắt buộc'),
    ndaaCompliant: z.boolean(),
    contactName: z.string().max(100).optional().nullable(),
    contactEmail: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
    contactPhone: z.string().max(20).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    paymentTerms: z.string().max(50).optional().nullable(),
    leadTimeDays: z.coerce.number().int().min(0, 'Lead time phải >= 0'),
    rating: z.coerce.number().min(0).max(5).optional().nullable(),
    category: z.string().max(50).optional().nullable(),
    status: z.enum(['active', 'inactive', 'pending']),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export const defaultSupplierValues: SupplierFormData = {
    code: '',
    name: '',
    taxId: '',
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
};
