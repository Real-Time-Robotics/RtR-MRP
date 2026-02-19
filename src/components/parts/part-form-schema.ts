
import { z } from 'zod';

// Category enum values matching API validation schema
export const CATEGORY_ENUM = ['FINISHED_GOOD', 'SEMI_FINISHED', 'COMPONENT', 'RAW_MATERIAL', 'PACKAGING', 'CONSUMABLE', 'TOOL'] as const;

// Display labels for categories (Vietnamese)
export const CATEGORY_LABELS: Record<string, string> = {
    'FINISHED_GOOD': 'Thành phẩm',
    'SEMI_FINISHED': 'Bán thành phẩm',
    'COMPONENT': 'Linh kiện',
    'RAW_MATERIAL': 'Nguyên liệu',
    'PACKAGING': 'Bao bì',
    'CONSUMABLE': 'Vật tư tiêu hao',
    'TOOL': 'Công cụ',
};

// Status/Lifecycle enum values matching API validation schema
export const STATUS_ENUM = ['DEVELOPMENT', 'PROTOTYPE', 'ACTIVE', 'PHASE_OUT', 'OBSOLETE', 'EOL'] as const;

// Display labels for status (Vietnamese)
export const STATUS_LABELS: Record<string, string> = {
    'DEVELOPMENT': 'Phát triển',
    'PROTOTYPE': 'Mẫu thử',
    'ACTIVE': 'Hoạt động',
    'PHASE_OUT': 'Ngừng dần',
    'OBSOLETE': 'Lỗi thời',
    'EOL': 'Kết thúc',
};

// Legacy - kept for backward compatibility
export const CATEGORIES = [
    'FINISHED_GOOD',
    'SEMI_FINISHED',
    'COMPONENT',
    'RAW_MATERIAL',
    'PACKAGING',
    'CONSUMABLE',
    'TOOL',
];

export const UNITS = ['EA', 'PCS', 'KG', 'G', 'M', 'CM', 'L', 'ML', 'BOX', 'SET', 'ROLL', 'SHEET'];

export const COUNTRIES = ['Việt Nam', 'USA', 'China', 'Japan', 'South Korea', 'Taiwan', 'Germany', 'UK', 'Singapore', 'Other'];

export const partSchema = z.object({
    partNumber: z.string().min(1, 'Mã part là bắt buộc').max(50),
    name: z.string().min(1, 'Tên part là bắt buộc').max(200),
    description: z.string().max(1000).optional().nullable(),
    category: z.enum(CATEGORY_ENUM, { message: 'Danh mục là bắt buộc' }),
    unit: z.string().min(1, 'Đơn vị là bắt buộc'),
    unitCost: z.coerce.number().min(0, 'Giá phải >= 0'),
    standardCost: z.coerce.number().min(0).optional().nullable(),
    averageCost: z.coerce.number().min(0).optional().nullable(),
    landedCost: z.coerce.number().min(0).optional().nullable(),
    freightPercent: z.coerce.number().min(0).max(100).optional().nullable(),
    dutyPercent: z.coerce.number().min(0).max(100).optional().nullable(),
    overheadPercent: z.coerce.number().min(0).max(100).optional().nullable(),
    priceBreakQty1: z.coerce.number().int().min(0).optional().nullable(),
    priceBreakCost1: z.coerce.number().min(0).optional().nullable(),
    priceBreakQty2: z.coerce.number().int().min(0).optional().nullable(),
    priceBreakCost2: z.coerce.number().min(0).optional().nullable(),
    priceBreakQty3: z.coerce.number().int().min(0).optional().nullable(),
    priceBreakCost3: z.coerce.number().min(0).optional().nullable(),

    // Basic (additional)
    subCategory: z.string().max(100).optional().nullable(),
    partType: z.string().max(50).optional().nullable(),

    // Physical
    weightKg: z.coerce.number().min(0).optional().nullable(),
    lengthMm: z.coerce.number().min(0).optional().nullable(),
    widthMm: z.coerce.number().min(0).optional().nullable(),
    heightMm: z.coerce.number().min(0).optional().nullable(),
    volumeCm3: z.coerce.number().min(0).optional().nullable(),
    material: z.string().max(100).optional().nullable(),
    color: z.string().max(50).optional().nullable(),

    // Procurement
    primarySupplierId: z.string().optional().nullable(),
    secondarySupplierIds: z.array(z.string()).optional().nullable(),
    makeOrBuy: z.enum(['MAKE', 'BUY', 'BOTH']),
    procurementType: z.string().optional().nullable(),
    buyerCode: z.string().max(50).optional().nullable(),
    leadTimeDays: z.coerce.number().int().min(0),
    moq: z.coerce.number().int().min(1),
    orderMultiple: z.coerce.number().int().min(1).optional().nullable(),
    standardPack: z.coerce.number().int().min(1).optional().nullable(),

    // Inventory
    minStockLevel: z.coerce.number().int().min(0),
    reorderPoint: z.coerce.number().int().min(0),
    maxStock: z.coerce.number().int().min(0).optional().nullable(),
    safetyStock: z.coerce.number().int().min(0).optional().nullable(),
    isCritical: z.boolean(),

    // Compliance
    countryOfOrigin: z.string().max(50).optional().nullable(),
    hsCode: z.string().max(20).optional().nullable(),
    eccn: z.string().max(20).optional().nullable(),
    ndaaCompliant: z.boolean(),
    itarControlled: z.boolean(),
    rohsCompliant: z.boolean(),
    reachCompliant: z.boolean(),

    // Quality Control
    lotControl: z.boolean(),
    serialControl: z.boolean(),
    shelfLifeDays: z.coerce.number().int().min(0).optional().nullable(),
    inspectionRequired: z.boolean(),
    inspectionPlan: z.string().max(100).optional().nullable(),
    aqlLevel: z.string().max(20).optional().nullable(),
    certificateRequired: z.boolean(),

    // Engineering
    revision: z.string().max(20),
    revisionDate: z.string().optional().nullable(), // ISO date string
    drawingNumber: z.string().max(100).optional().nullable(),
    drawingUrl: z.string().max(500).optional().nullable(),
    datasheetUrl: z.string().max(500).optional().nullable(),
    manufacturer: z.string().max(100).optional().nullable(),
    manufacturerPn: z.string().max(100).optional().nullable(),
    lifecycleStatus: z.enum(['DEVELOPMENT', 'PROTOTYPE', 'ACTIVE', 'PHASE_OUT', 'OBSOLETE', 'EOL']),
});

export type PartFormData = z.infer<typeof partSchema>;

export const defaultPartValues: PartFormData = {
    // Basic
    partNumber: '',
    name: '',
    description: '',
    category: 'COMPONENT',
    subCategory: null,
    partType: null,
    unit: 'EA',
    unitCost: 0,
    standardCost: null,
    averageCost: null,
    landedCost: null,
    freightPercent: null,
    dutyPercent: null,
    overheadPercent: null,
    priceBreakQty1: null,
    priceBreakCost1: null,
    priceBreakQty2: null,
    priceBreakCost2: null,
    priceBreakQty3: null,
    priceBreakCost3: null,

    // Physical
    weightKg: null,
    lengthMm: null,
    widthMm: null,
    heightMm: null,
    volumeCm3: null,
    material: null,
    color: null,

    // Procurement
    primarySupplierId: null,
    secondarySupplierIds: [],
    makeOrBuy: 'BUY',
    procurementType: null,
    buyerCode: null,
    leadTimeDays: 0,
    moq: 1,
    orderMultiple: null,
    standardPack: null,

    // Inventory
    minStockLevel: 0,
    reorderPoint: 0,
    maxStock: null,
    safetyStock: null,
    isCritical: false,

    // Compliance
    countryOfOrigin: null,
    hsCode: null,
    eccn: null,
    ndaaCompliant: true,
    itarControlled: false,
    rohsCompliant: true,
    reachCompliant: true,

    // Quality Control
    lotControl: false,
    serialControl: false,
    shelfLifeDays: null,
    inspectionRequired: true,
    inspectionPlan: null,
    aqlLevel: null,
    certificateRequired: false,

    // Engineering
    revision: 'A',
    revisionDate: null,
    drawingNumber: null,
    drawingUrl: null,
    datasheetUrl: null,
    manufacturer: null,
    manufacturerPn: null,
    lifecycleStatus: 'ACTIVE',
};
