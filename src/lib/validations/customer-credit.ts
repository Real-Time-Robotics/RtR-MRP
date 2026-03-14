import { z } from 'zod';

export const paymentTermsEnum = z.enum([
  'IMMEDIATE',
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
]);

export const customerTierEnum = z.enum(['A', 'B', 'C']);

export const contactTypeEnum = z.enum([
  'general',
  'billing',
  'shipping',
  'technical',
  'decision_maker',
]);

export const updateCreditSchema = z.object({
  creditLimit: z.number().nonnegative('Credit limit phải >= 0').optional(),
  paymentTerms: paymentTermsEnum.optional(),
  tier: customerTierEnum.optional(),
});

export const createContactSchema = z.object({
  name: z.string().min(1, 'Tên không được trống'),
  title: z.string().optional().nullable(),
  email: z
    .string()
    .email('Email không hợp lệ')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  contactType: contactTypeEnum.default('general'),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export const updateContactSchema = z.object({
  name: z.string().min(1, 'Tên không được trống').optional(),
  title: z.string().optional().nullable(),
  email: z
    .string()
    .email('Email không hợp lệ')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  contactType: contactTypeEnum.optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export type UpdateCreditInput = z.infer<typeof updateCreditSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
