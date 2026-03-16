import { z } from 'zod';

export const pricingRuleTypes = [
  'customer_specific',
  'quantity_break',
  'date_based',
  'category_discount',
] as const;

export const discountTypes = ['percent', 'fixed_amount', 'fixed_price'] as const;

export const createPricingRuleSchema = z
  .object({
    name: z.string().min(1, 'Tên quy tắc không được trống'),
    description: z.string().optional().nullable(),
    type: z.enum(pricingRuleTypes),
    customerId: z.string().optional().nullable(),
    partId: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    minQuantity: z.number().int().min(1).optional().nullable(),
    maxQuantity: z.number().int().min(1).optional().nullable(),
    validFrom: z.string().or(z.date()).optional().nullable(),
    validTo: z.string().or(z.date()).optional().nullable(),
    discountType: z.enum(discountTypes).default('percent'),
    discountValue: z.number().min(0, 'Giá trị giảm giá phải >= 0'),
    priority: z.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.minQuantity && data.maxQuantity) {
        return data.maxQuantity >= data.minQuantity;
      }
      return true;
    },
    { message: 'Số lượng tối đa phải >= số lượng tối thiểu' }
  )
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return new Date(data.validTo) >= new Date(data.validFrom);
      }
      return true;
    },
    { message: 'Ngày kết thúc phải >= ngày bắt đầu' }
  )
  .refine(
    (data) => {
      if (data.discountType === 'percent' && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    { message: 'Phần trăm giảm giá không được vượt quá 100%' }
  );

export const updatePricingRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(pricingRuleTypes).optional(),
  customerId: z.string().optional().nullable(),
  partId: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  minQuantity: z.number().int().min(1).optional().nullable(),
  maxQuantity: z.number().int().min(1).optional().nullable(),
  validFrom: z.string().or(z.date()).optional().nullable(),
  validTo: z.string().or(z.date()).optional().nullable(),
  discountType: z.enum(discountTypes).optional(),
  discountValue: z.number().min(0).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;
