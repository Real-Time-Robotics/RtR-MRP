import { z } from 'zod';

const quotationItemSchema = z.object({
  partId: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
  taxPercent: z.number().min(0).default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().min(1, 'Khách hàng là bắt buộc'),
  validUntil: z.string().min(1, 'Ngày hết hạn là bắt buộc'),
  currency: z.string().default('VND'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  items: z.array(quotationItemSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
});

export const updateQuotationSchema = createQuotationSchema.partial().extend({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']).optional(),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
