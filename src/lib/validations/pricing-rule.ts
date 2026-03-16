import { z } from 'zod';

export const createPricingRuleSchema = z.object({
  name: z.string().min(1, 'Tên quy tắc là bắt buộc'),
  description: z.string().optional(),
  type: z.enum(['customer_specific', 'quantity_break', 'date_based', 'category_discount']),
  customerId: z.string().optional(),
  partId: z.string().optional(),
  category: z.string().optional(),
  minQuantity: z.number().int().min(0).optional(),
  maxQuantity: z.number().int().min(0).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  discountType: z.enum(['percent', 'fixed_amount', 'fixed_price']).default('percent'),
  discountValue: z.number().min(0, 'Giá trị giảm phải >= 0'),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updatePricingRuleSchema = createPricingRuleSchema.partial();

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;
