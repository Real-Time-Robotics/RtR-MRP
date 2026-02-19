
import { Part } from '@/components/forms/part-form';
import { PartFormData } from './part-form-schema';

/**
 * Extended Part interface that includes nested relations (planning, costs, specs, compliance)
 * returned by the API when fetching a full part with its relations.
 */
export interface PartWithRelations extends Part {
    subCategory?: string | null;
    partType?: string | null;
    standardCost?: number | null;
    averageCost?: number | null;
    landedCost?: number | null;
    freightPercent?: number | null;
    dutyPercent?: number | null;
    overheadPercent?: number | null;
    priceBreakQty1?: number | null;
    priceBreakCost1?: number | null;
    priceBreakQty2?: number | null;
    priceBreakCost2?: number | null;
    priceBreakQty3?: number | null;
    priceBreakCost3?: number | null;
    volumeCm3?: number | null;
    primarySupplierId?: string | null;
    buyerCode?: string | null;
    standardPack?: number | null;
    hsCode?: string | null;
    eccn?: string | null;
    lotControl?: boolean;
    serialControl?: boolean;
    shelfLifeDays?: number | null;
    inspectionRequired?: boolean;
    inspectionPlan?: string | null;
    aqlLevel?: string | null;
    certificateRequired?: boolean;
    drawingUrl?: string | null;
    datasheetUrl?: string | null;
    partSuppliers?: Array<{ supplierId: string }>;
    planning?: {
        leadTimeDays?: number;
        moq?: number;
        orderMultiple?: number | null;
        standardPack?: number | null;
        minStockLevel?: number;
        reorderPoint?: number;
        maxStock?: number | null;
        safetyStock?: number | null;
        makeOrBuy?: string;
        procurementType?: string;
        buyerCode?: string | null;
    };
    costs?: {
        unitCost?: number;
        standardCost?: number | null;
        averageCost?: number | null;
        landedCost?: number | null;
        freightPercent?: number | null;
        dutyPercent?: number | null;
        overheadPercent?: number | null;
        priceBreakQty1?: number | null;
        priceBreakCost1?: number | null;
        priceBreakQty2?: number | null;
        priceBreakCost2?: number | null;
        priceBreakQty3?: number | null;
        priceBreakCost3?: number | null;
    };
    specs?: {
        weightKg?: number | null;
        lengthMm?: number | null;
        widthMm?: number | null;
        heightMm?: number | null;
        volumeCm3?: number | null;
        material?: string | null;
        color?: string | null;
        drawingNumber?: string | null;
        drawingUrl?: string | null;
        datasheetUrl?: string | null;
        manufacturer?: string | null;
        manufacturerPn?: string | null;
    };
    compliance?: {
        countryOfOrigin?: string | null;
        hsCode?: string | null;
        eccn?: string | null;
        ndaaCompliant?: boolean;
        itarControlled?: boolean;
        rohsCompliant?: boolean;
        reachCompliant?: boolean;
    };
}

// Tab order for navigation
export const TAB_ORDER = ['basic', 'physical', 'engineering', 'procurement', 'quality', 'compliance'] as const;

// Define which fields belong to which tab
export const TAB_FIELDS: Record<string, (keyof PartFormData)[]> = {
    basic: ['partNumber', 'name', 'description', 'category', 'subCategory', 'partType', 'unit', 'unitCost', 'standardCost', 'averageCost', 'landedCost', 'freightPercent', 'dutyPercent', 'overheadPercent', 'priceBreakQty1', 'priceBreakCost1', 'priceBreakQty2', 'priceBreakCost2', 'priceBreakQty3', 'priceBreakCost3', 'isCritical'],
    physical: ['weightKg', 'lengthMm', 'widthMm', 'heightMm', 'volumeCm3', 'material', 'color'],
    engineering: ['revision', 'revisionDate', 'drawingNumber', 'drawingUrl', 'datasheetUrl', 'manufacturer', 'manufacturerPn', 'lifecycleStatus'],
    procurement: ['primarySupplierId', 'makeOrBuy', 'procurementType', 'buyerCode', 'leadTimeDays', 'moq', 'orderMultiple', 'standardPack', 'minStockLevel', 'reorderPoint', 'safetyStock', 'maxStock'],
    compliance: ['countryOfOrigin', 'hsCode', 'eccn', 'ndaaCompliant', 'itarControlled', 'rohsCompliant', 'reachCompliant'],
    quality: ['lotControl', 'serialControl', 'shelfLifeDays', 'inspectionRequired', 'inspectionPlan', 'aqlLevel', 'certificateRequired'],
};

// Required fields per tab (fields that must be filled before moving to next tab)
export const TAB_REQUIRED_FIELDS: Record<string, (keyof PartFormData)[]> = {
    basic: ['partNumber', 'name', 'category', 'unit'],
    physical: ['weightKg'],
    engineering: ['manufacturer', 'manufacturerPn'],
    procurement: ['primarySupplierId', 'leadTimeDays', 'moq'],
    quality: [], // All have defaults
    compliance: ['countryOfOrigin'],
};

// Tab display names
export const TAB_NAMES: Record<string, string> = {
    basic: 'Cơ bản',
    physical: 'Vật lý',
    engineering: 'Kỹ thuật',
    procurement: 'Mua hàng',
    quality: 'Chất lượng',
    compliance: 'Tuân thủ',
};

/** Common props for all tab section components */
export interface TabSectionProps {
    isEditing: boolean;
    isSubmitting: boolean;
    isTabDirty: boolean;
    onResetTab: () => void;
}

/** Supplier record used across multiple components */
export interface SupplierRecord {
    id: string;
    name: string;
    code: string;
}
