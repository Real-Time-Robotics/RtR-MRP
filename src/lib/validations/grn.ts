import { z } from 'zod';

const grnItemSchema = z.object({
  poLineId: z.string().min(1, 'poLineId là bắt buộc'),
  partId: z.string().min(1, 'partId là bắt buộc'),
  quantityOrdered: z.number().int().positive(),
  quantityReceived: z.number().int().min(0),
  quantityAccepted: z.number().int().min(0),
  quantityRejected: z.number().int().min(0).default(0),
  rejectionReason: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

export const createGRNSchema = z.object({
  purchaseOrderId: z.string().min(1, 'purchaseOrderId là bắt buộc'),
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(grnItemSchema).min(1, 'Phải có ít nhất 1 mặt hàng'),
});

export type CreateGRNInput = z.infer<typeof createGRNSchema>;
