import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

export const partSchema = z.object({
  partNumber: z.string().min(1, 'Ma part la bat buoc').max(50),
  name: z.string().min(1, 'Ten part la bat buoc').max(200),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().min(1, 'Danh muc la bat buoc'),
  unit: z.string().min(1, 'Don vi la bat buoc'),
  unitCost: z.number().min(0, 'Gia phai >= 0'),

  // Physical
  weightKg: z.number().min(0).optional().nullable(),
  lengthMm: z.number().min(0).optional().nullable(),
  widthMm: z.number().min(0).optional().nullable(),
  heightMm: z.number().min(0).optional().nullable(),
  material: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),

  // Procurement
  makeOrBuy: z.enum(['MAKE', 'BUY', 'BOTH']),
  procurementType: z.string().optional().nullable(),
  leadTimeDays: z.number().int().min(0),
  moq: z.number().int().min(1),
  orderMultiple: z.number().int().min(1).optional().nullable(),

  // Inventory
  minStockLevel: z.number().int().min(0),
  reorderPoint: z.number().int().min(0),
  maxStock: z.number().int().min(0).optional().nullable(),
  safetyStock: z.number().int().min(0).optional().nullable(),
  isCritical: z.boolean(),

  // Compliance
  countryOfOrigin: z.string().max(50).optional().nullable(),
  ndaaCompliant: z.boolean(),
  itarControlled: z.boolean(),
  rohsCompliant: z.boolean(),
  reachCompliant: z.boolean(),

  // Manufacturing
  manufacturingStrategy: z.enum(['MTS', 'MTO', 'ATO']).optional().nullable(),
  pickingStrategy: z.enum(['FIFO', 'FEFO', 'ANY']).optional().nullable(),

  // Engineering
  revision: z.string().max(20),
  manufacturer: z.string().max(100).optional().nullable(),
  manufacturerPn: z.string().max(100).optional().nullable(),
  lifecycleStatus: z.enum(['DEVELOPMENT', 'PROTOTYPE', 'ACTIVE', 'PHASE_OUT', 'OBSOLETE', 'EOL']),
});

export type PartFormData = z.infer<typeof partSchema>;

// =============================================================================
// CONSTANTS
// =============================================================================

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

export const COUNTRIES = ['Vi\u1EC7t Nam', 'USA', 'China', 'Japan', 'South Korea', 'Taiwan', 'Germany', 'UK', 'Singapore', 'Other'];

// =============================================================================
// SHARED PROPS
// =============================================================================

export interface PartFormTabProps {
  form: UseFormReturn<PartFormData>;
  isEditing: boolean;
  t: (key: string, params?: Record<string, string>) => string;
}
