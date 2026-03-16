import { z } from 'zod';

export const grnItemSchema = z.object({
  poLineId: z.string().min(1, 'ID dòng PO là bắt buộc'),
  partId: z.string().min(1, 'ID linh kiện là bắt buộc'),
  quantityOrdered: z.number().int().min(0),
  quantityReceived: z.number().int().min(0, 'Số lượng nhận phải >= 0'),
  quantityAccepted: z.number().int().min(0, 'Số lượng chấp nhận phải >= 0'),
  quantityRejected: z.number().int().min(0).default(0),
  rejectionReason: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().or(z.date()).optional(),
});

export const createGRNSchema = z.object({
  purchaseOrderId: z.string().min(1, 'ID đơn mua hàng là bắt buộc'),
  receivedDate: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
  items: z.array(grnItemSchema).min(1, 'Phải có ít nhất 1 dòng hàng'),
}).refine(
  (data) =>
    data.items.every(
      (item) => item.quantityAccepted + item.quantityRejected <= item.quantityReceived
    ),
  { message: 'Số lượng chấp nhận + từ chối không được vượt quá số lượng nhận' }
);

export type CreateGRNInput = z.infer<typeof createGRNSchema>;
