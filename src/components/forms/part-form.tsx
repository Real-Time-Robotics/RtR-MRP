'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { useMutation } from '@/hooks/use-mutation';

import { partSchema, PartFormData } from './part-form/types';
import { PartFormBasicTab } from './part-form/part-form-basic';
import { PartFormPhysicalTab } from './part-form/part-form-physical';
import { PartFormProcurementTab } from './part-form/part-form-procurement';
import { PartFormComplianceTab } from './part-form/part-form-compliance';

// =============================================================================
// TYPES
// =============================================================================

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

  const tabProps = { form, isEditing, t };

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
                <PartFormBasicTab {...tabProps} />
              </TabsContent>

              {/* Physical Tab */}
              <TabsContent value="physical" className="space-y-4 mt-4">
                <PartFormPhysicalTab {...tabProps} />
              </TabsContent>

              {/* Procurement Tab */}
              <TabsContent value="procurement" className="space-y-4 mt-4">
                <PartFormProcurementTab {...tabProps} />
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-4 mt-4">
                <PartFormComplianceTab {...tabProps} />
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
