import { z } from 'zod';

export const quotationItemSchema = z.object({
  partId: z.string().min(1, 'ID linh kiện là bắt buộc'),
  description: z.string().optional(),
  quantity: z.number().int().min(1, 'Số lượng phải >= 1').max(999999),
  unitPrice: z.number().min(0, 'Đơn giá phải >= 0').max(999999999),
  discountPercent: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).max(100).default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().min(1, 'Vui lòng chọn khách hàng'),
  validUntil: z.string().or(z.date()),
  discountPercent: z.number().min(0).max(100).default(0),
  currency: z.string().default('VND'),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, 'Báo giá phải có ít nhất 1 sản phẩm'),
});

export const updateQuotationSchema = z.object({
  customerId: z.string().min(1).optional(),
  validUntil: z.string().or(z.date()).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  currency: z.string().optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1).optional(),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
