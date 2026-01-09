
import { z } from 'zod';

export const CATEGORIES = [
    'Finished Goods',
    'Component',
    'Raw Material',
    'Packaging',
    'Consumable',
    'Service',
    'Other',
];

export const UNITS = ['EA', 'PCS', 'KG', 'G', 'M', 'CM', 'L', 'ML', 'BOX', 'SET', 'ROLL', 'SHEET'];

export const COUNTRIES = ['Việt Nam', 'USA', 'China', 'Japan', 'South Korea', 'Taiwan', 'Germany', 'UK', 'Singapore', 'Other'];

export const partSchema = z.object({
    partNumber: z.string().min(1, 'Mã part là bắt buộc').max(50),
    name: z.string().min(1, 'Tên part là bắt buộc').max(200),
    description: z.string().max(1000).optional().nullable(),
    category: z.string().min(1, 'Danh mục là bắt buộc'),
    unit: z.string().min(1, 'Đơn vị là bắt buộc'),
    unitCost: z.coerce.number().min(0, 'Giá phải >= 0'),

    // Physical
    weightKg: z.coerce.number().min(0).optional().nullable(),
    lengthMm: z.coerce.number().min(0).optional().nullable(),
    widthMm: z.coerce.number().min(0).optional().nullable(),
    heightMm: z.coerce.number().min(0).optional().nullable(),
    material: z.string().max(100).optional().nullable(),
    color: z.string().max(50).optional().nullable(),

    // Procurement
    makeOrBuy: z.enum(['MAKE', 'BUY', 'BOTH']),
    procurementType: z.string().optional().nullable(),
    leadTimeDays: z.coerce.number().int().min(0),
    moq: z.coerce.number().int().min(1),
    orderMultiple: z.coerce.number().int().min(1).optional().nullable(),

    // Inventory
    minStockLevel: z.coerce.number().int().min(0),
    reorderPoint: z.coerce.number().int().min(0),
    maxStock: z.coerce.number().int().min(0).optional().nullable(),
    safetyStock: z.coerce.number().int().min(0).optional().nullable(),
    isCritical: z.boolean(),

    // Compliance
    countryOfOrigin: z.string().max(50).optional().nullable(),
    ndaaCompliant: z.boolean(),
    itarControlled: z.boolean(),
    rohsCompliant: z.boolean(),
    reachCompliant: z.boolean(),

    // Engineering
    revision: z.string().max(20),
    manufacturer: z.string().max(100).optional().nullable(),
    manufacturerPn: z.string().max(100).optional().nullable(),
    lifecycleStatus: z.enum(['DEVELOPMENT', 'PROTOTYPE', 'ACTIVE', 'PHASE_OUT', 'OBSOLETE', 'EOL']),
});

export type PartFormData = z.infer<typeof partSchema>;

export const defaultPartValues: PartFormData = {
    partNumber: '',
    name: '',
    description: '',
    category: 'Component',
    unit: 'EA',
    unitCost: 0,
    makeOrBuy: 'BUY',
    leadTimeDays: 14,
    moq: 1,
    minStockLevel: 0,
    reorderPoint: 0,
    isCritical: false,
    ndaaCompliant: true,
    itarControlled: false,
    rohsCompliant: true,
    reachCompliant: true,
    revision: 'A',
    lifecycleStatus: 'ACTIVE',
    // Optional numeric fields need to be null or undefined, handled by form reset usually
};
