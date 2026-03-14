import { z } from 'zod';

export const calculateScoreSchema = z.object({
  periodStart: z.string().min(1, 'Ngày bắt đầu là bắt buộc'),
  periodEnd: z.string().min(1, 'Ngày kết thúc là bắt buộc'),
}).refine((data) => {
  return new Date(data.periodEnd) > new Date(data.periodStart);
}, { message: 'Ngày kết thúc phải sau ngày bắt đầu' });

export const auditTypeEnum = z.enum([
  'quality',
  'compliance',
  'financial',
  'site_visit',
]);

export const auditStatusEnum = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

export const createAuditSchema = z.object({
  auditDate: z.string().min(1, 'Ngày audit là bắt buộc'),
  auditType: auditTypeEnum,
  score: z.number().min(0, 'Điểm phải >= 0').max(100, 'Điểm phải <= 100').optional().nullable(),
  findings: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  nextAuditDate: z.string().optional().nullable(),
  status: auditStatusEnum.default('completed'),
});

export const updateAuditSchema = z.object({
  auditDate: z.string().optional(),
  auditType: auditTypeEnum.optional(),
  score: z.number().min(0).max(100).optional().nullable(),
  findings: z.string().optional().nullable(),
  recommendations: z.string().optional().nullable(),
  nextAuditDate: z.string().optional().nullable(),
  status: auditStatusEnum.optional(),
});

export type CalculateScoreInput = z.infer<typeof calculateScoreSchema>;
export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
