'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChangeImpactDialog,
  useChangeImpact,
  detectChanges,
} from '@/components/change-impact';
import { FieldChange } from '@/lib/change-impact/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { useMutation } from '@/hooks/use-mutation';

// =============================================================================
// TYPES & VALIDATION
// =============================================================================

const partSchema = z.object({
  partNumber: z.string().min(1, 'Mã part là bắt buộc').max(50),
  name: z.string().min(1, 'Tên part là bắt buộc').max(200),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().min(1, 'Danh mục là bắt buộc'),
  unit: z.string().min(1, 'Đơn vị là bắt buộc'),
  unitCost: z.number().min(0, 'Giá phải >= 0'),

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

type PartFormData = z.infer<typeof partSchema>;

export interface Part {
  id: string;
  partNumber: string;
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  unitCost: number;
  weightKg?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  material?: string | null;
  color?: string | null;
  makeOrBuy: string;
  procurementType?: string | null;
  manufacturingStrategy?: string | null;
  pickingStrategy?: string | null;
  leadTimeDays: number;
  moq: number;
  orderMultiple?: number | null;
  minStockLevel: number;
  reorderPoint: number;
  maxStock?: number | null;
  safetyStock?: number | null;
  isCritical: boolean;
  countryOfOrigin?: string | null;
  ndaaCompliant: boolean;
  itarControlled: boolean;
  rohsCompliant: boolean;
  reachCompliant: boolean;
  revision: string;
  revisionDate?: string | Date | null;
  drawingNumber?: string | null;
  manufacturer?: string | null;
  manufacturerPn?: string | null;
  lifecycleStatus: string;
}

interface PartFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part?: Part | null;
  onSuccess?: (part: Part) => void;
}

const CATEGORIES = [
  'Finished Goods',
  'Component',
  'Raw Material',
  'Packaging',
  'Consumable',
  'Service',
  'Other',
];

const UNITS = ['EA', 'PCS', 'KG', 'G', 'M', 'CM', 'L', 'ML', 'BOX', 'SET', 'ROLL', 'SHEET'];

const COUNTRIES = ['Việt Nam', 'USA', 'China', 'Japan', 'South Korea', 'Taiwan', 'Germany', 'UK', 'Singapore', 'Other'];

// =============================================================================
// CHANGE IMPACT CONFIGURATION
// =============================================================================

const PART_IMPACT_FIELDS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  unitCost: { label: 'Giá', valueType: 'currency' },
  leadTimeDays: { label: 'Lead Time', valueType: 'number' },
  lifecycleStatus: { label: 'Trạng thái', valueType: 'string' },
  minStockLevel: { label: 'Min Stock Level', valueType: 'number' },
  reorderPoint: { label: 'Reorder Point', valueType: 'number' },
  makeOrBuy: { label: 'Make/Buy', valueType: 'string' },
  moq: { label: 'MOQ', valueType: 'number' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function PartForm({ open, onOpenChange, part, onSuccess }: PartFormProps) {
  const { t } = useLanguage();
  const isEditing = !!part;

  // Change Impact state
  const originalValuesRef = useRef<Record<string, unknown> | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<PartFormData | null>(null);

  const form = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      partNumber: '',
      name: '',
      description: '',
      category: 'Component',
      unit: 'EA',
      unitCost: 0,
      makeOrBuy: 'BUY',
      leadTimeDays: 0,
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
    },
  });

  useEffect(() => {
    if (open) {
      if (part) {
        form.reset({
          partNumber: part.partNumber,
          name: part.name,
          description: part.description || '',
          category: part.category,
          unit: part.unit,
          unitCost: part.unitCost,
          weightKg: part.weightKg,
          lengthMm: part.lengthMm,
          widthMm: part.widthMm,
          heightMm: part.heightMm,
          material: part.material || '',
          color: part.color || '',
          makeOrBuy: part.makeOrBuy as 'MAKE' | 'BUY' | 'BOTH',
          procurementType: part.procurementType || '',
          manufacturingStrategy: (part.manufacturingStrategy as 'MTS' | 'MTO' | 'ATO') || null,
          pickingStrategy: (part.pickingStrategy as 'FIFO' | 'FEFO' | 'ANY') || null,
          leadTimeDays: part.leadTimeDays,
          moq: part.moq,
          orderMultiple: part.orderMultiple,
          minStockLevel: part.minStockLevel,
          reorderPoint: part.reorderPoint,
          maxStock: part.maxStock,
          safetyStock: part.safetyStock,
          isCritical: part.isCritical,
          countryOfOrigin: part.countryOfOrigin || '',
          ndaaCompliant: part.ndaaCompliant,
          itarControlled: part.itarControlled,
          rohsCompliant: part.rohsCompliant,
          reachCompliant: part.reachCompliant,
          revision: part.revision,
          manufacturer: part.manufacturer || '',
          manufacturerPn: part.manufacturerPn || '',
          lifecycleStatus: part.lifecycleStatus as PartFormData['lifecycleStatus'],
        });

        // Store original values for Change Impact
        originalValuesRef.current = {
          unitCost: part.unitCost,
          leadTimeDays: part.leadTimeDays,
          lifecycleStatus: part.lifecycleStatus,
          minStockLevel: part.minStockLevel,
          reorderPoint: part.reorderPoint,
          makeOrBuy: part.makeOrBuy,
          moq: part.moq,
        };
      } else {
        originalValuesRef.current = null;
        form.reset({
          partNumber: '',
          name: '',
          description: '',
          category: 'Component',
          unit: 'EA',
          unitCost: 0,
          makeOrBuy: 'BUY',
          leadTimeDays: 0,
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
        });
      }
    }
  }, [open, part, form]);

  const mutation = useMutation<PartFormData, Part>({
    url: isEditing ? `/api/parts/${part!.id}` : '/api/parts',
    method: isEditing ? 'PUT' : 'POST',
    setError: form.setError,
    revalidateKeys: ['/api/parts'],
    successMessage: isEditing ? t('partForm.updateSuccess') : t('partForm.createSuccess'),
    onSuccess: (data) => { onSuccess?.(data); onOpenChange(false); },
    transformData: (data) => ({
      ...data,
      description: data.description || null,
      material: data.material || null,
      color: data.color || null,
      procurementType: data.procurementType || null,
      manufacturingStrategy: data.manufacturingStrategy || null,
      pickingStrategy: data.pickingStrategy || null,
      countryOfOrigin: data.countryOfOrigin || null,
      manufacturer: data.manufacturer || null,
      manufacturerPn: data.manufacturerPn || null,
    }),
  });

  // Change Impact hook
  const changeImpact = useChangeImpact({
    onSuccess: () => {
      if (pendingSubmitData) {
        mutation.mutate(pendingSubmitData);
        setPendingSubmitData(null);
      }
    },
    onError: () => {
      if (pendingSubmitData) {
        mutation.mutate(pendingSubmitData);
        setPendingSubmitData(null);
      }
    },
  });

  const onSubmit = async (data: PartFormData) => {
    if (isEditing && part && originalValuesRef.current) {
      const newValues = {
        unitCost: data.unitCost,
        leadTimeDays: data.leadTimeDays,
        lifecycleStatus: data.lifecycleStatus,
        minStockLevel: data.minStockLevel,
        reorderPoint: data.reorderPoint,
        makeOrBuy: data.makeOrBuy,
        moq: data.moq,
      };

      const changes = detectChanges(
        originalValuesRef.current,
        newValues,
        PART_IMPACT_FIELDS
      );

      if (changes.length > 0) {
        setPendingSubmitData(data);
        changeImpact.checkImpact('part', part.id, changes);
        return;
      }
    }

    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? t('partForm.editTitle') : t('partForm.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('partForm.editDesc') : t('partForm.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="basic">{t('partForm.tabBasic')}</TabsTrigger>
                <TabsTrigger value="physical">{t('partForm.tabPhysical')}</TabsTrigger>
                <TabsTrigger value="procurement">{t('partForm.tabProcurement')}</TabsTrigger>
                <TabsTrigger value="compliance">{t('partForm.tabCompliance')}</TabsTrigger>
              </TabsList>

              {/* Basic Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="partNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.partNumber')}</FormLabel>
                        <FormControl>
                          <Input placeholder="PART-001" {...field} disabled={isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lifecycleStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('form.status')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DEVELOPMENT">{t('lifecycle.development')}</SelectItem>
                            <SelectItem value="PROTOTYPE">{t('lifecycle.prototype')}</SelectItem>
                            <SelectItem value="ACTIVE">{t('lifecycle.active')}</SelectItem>
                            <SelectItem value="PHASE_OUT">{t('lifecycle.phaseOut')}</SelectItem>
                            <SelectItem value="OBSOLETE">{t('lifecycle.obsolete')}</SelectItem>
                            <SelectItem value="EOL">{t('lifecycle.eol')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('partForm.partName')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Tên sản phẩm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('partForm.description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('partForm.descPlaceholder')} {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.category')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.unit')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.unitCost')}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step={0.01} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.manufacturer')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Manufacturer" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manufacturerPn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.mpn')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Manufacturer Part Number" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isCritical"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t('partForm.criticalPart')}</FormLabel>
                        <FormDescription>{t('partForm.criticalDesc')}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Physical Tab */}
              <TabsContent value="physical" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.weightKg')}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step={0.001} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.material')}</FormLabel>
                        <FormControl>
                          <Input placeholder="Aluminum, Steel, Plastic..." {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="lengthMm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.lengthMm')}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="widthMm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.widthMm')}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="heightMm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.heightMm')}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('partForm.color')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Black, White, Silver..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Procurement Tab */}
              <TabsContent value="procurement" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="makeOrBuy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.makeOrBuy')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MAKE">{t('makeOrBuy.make')}</SelectItem>
                            <SelectItem value="BUY">{t('makeOrBuy.buy')}</SelectItem>
                            <SelectItem value="BOTH">{t('makeOrBuy.both')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leadTimeDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.leadTimeDays')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? 0 : parseInt(val, 10) || 0);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manufacturingStrategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.manufacturingStrategy')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('partForm.selectStrategy')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MTS">{t('strategy.mts')}</SelectItem>
                            <SelectItem value="MTO">{t('strategy.mto')}</SelectItem>
                            <SelectItem value="ATO">{t('strategy.ato')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('partForm.manufacturingStrategyDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pickingStrategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.pickingStrategy')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('partForm.selectPicking')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FIFO">{t('picking.fifo')}</SelectItem>
                            <SelectItem value="FEFO">{t('picking.fefo')}</SelectItem>
                            <SelectItem value="ANY">{t('picking.any')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('partForm.pickingStrategyDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="moq"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.moq')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? 1 : parseInt(val, 10) || 1);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription>{t('partForm.moqDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orderMultiple"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.orderMultiple')}</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.minStockLevel')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? 0 : parseInt(val, 10) || 0);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reorderPoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.reorderPoint')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val === '' ? 0 : parseInt(val, 10) || 0);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="safetyStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.safetyStock')}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.maxStock')}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="countryOfOrigin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.origin')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('partForm.selectCountry')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="revision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('partForm.revision')}</FormLabel>
                        <FormControl>
                          <Input placeholder="A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="ndaaCompliant"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('partForm.ndaaCompliant')}</FormLabel>
                          <FormDescription>{t('partForm.ndaaDesc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="itarControlled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('partForm.itarControlled')}</FormLabel>
                          <FormDescription>{t('partForm.itarDesc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rohsCompliant"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('partForm.rohsCompliant')}</FormLabel>
                          <FormDescription>{t('partForm.rohsDesc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reachCompliant"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('partForm.reachCompliant')}</FormLabel>
                          <FormDescription>{t('partForm.reachDesc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isLoading}>
                {t('form.cancel')}
              </Button>
              <Button type="submit" disabled={mutation.isLoading}>
                {mutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('form.save') : t('partForm.createBtn')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Change Impact Dialog */}
      <ChangeImpactDialog
        open={changeImpact.showDialog}
        onOpenChange={changeImpact.setShowDialog}
        result={changeImpact.result}
        loading={changeImpact.loading}
        onConfirm={changeImpact.confirm}
        onCancel={() => {
          changeImpact.cancel();
          setPendingSubmitData(null);
        }}
      />
    </Dialog>
  );
}

// =============================================================================
// DELETE DIALOG
// =============================================================================

interface DeletePartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part | null;
  onSuccess?: () => void;
}

export function DeletePartDialog({ open, onOpenChange, part, onSuccess }: DeletePartDialogProps) {
  const { t } = useLanguage();

  const deleteMutation = useMutation({
    url: `/api/parts/${part?.id}`,
    method: 'DELETE',
    revalidateKeys: ['/api/parts'],
    successMessage: t('partForm.deleteSuccess'),
    onSuccess: () => { onSuccess?.(); onOpenChange(false); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('form.confirmDelete')}</DialogTitle>
          <DialogDescription>
            {t('partForm.deleteConfirmDesc', { name: part?.name || '', code: part?.partNumber || '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isLoading}>
            {t('form.cancel')}
          </Button>
          <Button variant="destructive" onClick={() => part && deleteMutation.mutate()} disabled={deleteMutation.isLoading}>
            {deleteMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('form.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PartForm;
