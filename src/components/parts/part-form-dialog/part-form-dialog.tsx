
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientLogger } from '@/lib/client-logger';
import { FormModal } from '@/components/ui-v2/form-modal';
import { useDataEntry } from '@/hooks/use-data-entry';
import { Part } from '@/components/forms/part-form';
import {
    ChangeImpactDialog,
    useChangeImpact,
    detectChanges,
    PART_FORM_FIELD_CONFIG,
} from '@/components/change-impact';
import { Form } from '@/components/ui/form';
import { ComboboxOption } from '@/components/ui/combobox';
import {
    partSchema,
    PartFormData,
    defaultPartValues,
} from '../part-form-schema';
import type { Resolver } from 'react-hook-form';
import {
    PartWithRelations,
    TAB_ORDER,
    TAB_FIELDS,
    TAB_REQUIRED_FIELDS,
    TAB_NAMES,
    SupplierRecord,
} from '../part-form-types';
import { CreateSupplierDialog, SupplierPickerDialog } from '../part-form-supplier-dialog';
import { PartFormDialogTabs } from './part-form-dialog-tabs';
import { PartFormDialogFooter } from './part-form-dialog-footer';
import type { PartFormDialogProps } from './types';

export function PartFormDialog({ open, onOpenChange, part, onSuccess }: PartFormDialogProps) {
    // Track form mode: 'create' or 'edit'
    const [formMode, setFormMode] = useState<'create' | 'edit'>(part ? 'edit' : 'create');
    const [savedPartId, setSavedPartId] = useState<string | null>(part?.id ?? null);

    // Derived state for API calls
    const isEditing = formMode === 'edit';

    // Store original values for change detection
    const originalValuesRef = useRef<Record<string, unknown> | null>(null);
    const [pendingSubmitData, setPendingSubmitData] = useState<PartFormData | null>(null);

    // Track current tab and saved state per tab
    const [activeTab, setActiveTab] = useState('basic');
    const [savedTabs, setSavedTabs] = useState<Set<string>>(new Set());
    const initialFormValuesRef = useRef<PartFormData | null>(null);

    // Track if we should close after save
    const [closeAfterSave, setCloseAfterSave] = useState(false);

    // Suppliers list for dropdown
    const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);

    // Create Supplier dialog
    const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

    // Manufacturers list for dropdown
    const [manufacturers, setManufacturers] = useState<ComboboxOption[]>([]);

    // Supplier picker when multiple match manufacturer name
    const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
    const [matchingSuppliers, setMatchingSuppliers] = useState<SupplierRecord[]>([]);

    // 1. Setup Form Hook
    const form = useForm<PartFormData>({
        resolver: zodResolver(partSchema) as Resolver<PartFormData>,
        defaultValues: defaultPartValues,
    });

    // Watch required fields to determine form completeness
    const watchedPartNumber = form.watch('partNumber');
    const watchedName = form.watch('name');
    const watchedCategory = form.watch('category');
    const watchedUnit = form.watch('unit');
    const watchedWeightKg = form.watch('weightKg');
    const watchedManufacturer = form.watch('manufacturer');
    const watchedManufacturerPn = form.watch('manufacturerPn');
    const watchedPrimarySupplierId = form.watch('primarySupplierId');
    const watchedLeadTimeDays = form.watch('leadTimeDays');
    const watchedMoq = form.watch('moq');
    const watchedCountryOfOrigin = form.watch('countryOfOrigin');

    // Check if a specific tab's required fields are filled
    const isTabComplete = (tabName: string): boolean => {
        const requiredFields = TAB_REQUIRED_FIELDS[tabName] || [];
        if (requiredFields.length === 0) return true;

        const values = form.getValues();
        return requiredFields.every((field) => {
            const value = values[field];
            if (typeof value === 'string') return value.trim() !== '';
            if (typeof value === 'number') {
                if (field === 'leadTimeDays') return value >= 0;
                if (field === 'moq') return value >= 1;
                return value > 0;
            }
            return value !== null && value !== undefined;
        });
    };

    // Check if current tab's required fields are filled
    const isCurrentTabComplete = useMemo(() => {
        return isTabComplete(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, watchedPartNumber, watchedName, watchedCategory, watchedUnit,
        watchedWeightKg, watchedManufacturer, watchedManufacturerPn,
        watchedPrimarySupplierId, watchedLeadTimeDays, watchedMoq, watchedCountryOfOrigin]);

    // Form is complete when all required fields across all tabs are filled
    const isFormComplete = useMemo(() => {
        return TAB_ORDER.every((tab) => isTabComplete(tab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchedPartNumber, watchedName, watchedCategory, watchedUnit,
        watchedWeightKg, watchedManufacturer, watchedManufacturerPn,
        watchedPrimarySupplierId, watchedLeadTimeDays, watchedMoq, watchedCountryOfOrigin]);

    // Can save draft when at least partNumber is filled
    const canSaveDraft = useMemo(() => {
        return !!(watchedPartNumber?.trim());
    }, [watchedPartNumber]);

    // Get current tab index
    const currentTabIndex = TAB_ORDER.indexOf(activeTab as typeof TAB_ORDER[number]);
    const isLastTab = currentTabIndex === TAB_ORDER.length - 1;

    // Navigate to next tab
    const goToNextTab = () => {
        if (!isLastTab) {
            setActiveTab(TAB_ORDER[currentTabIndex + 1]);
        }
    };

    // Get the name of the next tab (for button label)
    const nextTabName = !isLastTab ? TAB_NAMES[TAB_ORDER[currentTabIndex + 1]] : null;

    // Setup Change Impact Hook
    const changeImpact = useChangeImpact({
        onSuccess: () => {
            if (pendingSubmitData) {
                performSave(pendingSubmitData);
            }
        },
        onError: (error) => {
            clientLogger.error('Change impact error', error);
            if (pendingSubmitData) {
                performSave(pendingSubmitData);
            }
        },
    });

    // 2. Setup Data Entry Hook
    const { submit: performSave, isSubmitting } = useDataEntry<PartFormData>({
        onSubmit: async (data: PartFormData) => {
            const cleanData: Record<string, unknown> = {};

            const requiredNumberFields = ['unitCost', 'leadTimeDays', 'moq', 'minStockLevel', 'reorderPoint'];
            const optionalNumberFields = ['weightKg', 'lengthMm', 'widthMm', 'heightMm', 'volumeCm3', 'orderMultiple', 'standardPack', 'maxStock', 'safetyStock', 'shelfLifeDays', 'standardCost', 'averageCost', 'landedCost', 'freightPercent', 'dutyPercent', 'overheadPercent', 'priceBreakQty1', 'priceBreakCost1', 'priceBreakQty2', 'priceBreakCost2', 'priceBreakQty3', 'priceBreakCost3'];

            Object.entries(data).forEach(([key, value]) => {
                if (value === '' || value === undefined) {
                    if (requiredNumberFields.includes(key)) {
                        cleanData[key] = 0;
                    } else {
                        cleanData[key] = null;
                    }
                } else if (typeof value === 'string' && (requiredNumberFields.includes(key) || optionalNumberFields.includes(key))) {
                    const num = parseFloat(value);
                    cleanData[key] = isNaN(num) ? (requiredNumberFields.includes(key) ? 0 : null) : num;
                } else {
                    cleanData[key] = value;
                }
            });

            const url = isEditing ? `/api/parts/${savedPartId}` : '/api/parts';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanData),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.details && Array.isArray(result.details)) {
                    const errorMessages: string[] = [];
                    result.details.forEach((detail: { field: string; message: string }) => {
                        if (detail.field && detail.message) {
                            form.setError(detail.field as keyof PartFormData, {
                                type: 'server',
                                message: detail.message,
                            });
                            errorMessages.push(`${detail.field}: ${detail.message}`);
                        }
                    });
                    clientLogger.error('Validation errors', errorMessages);
                    throw new Error(errorMessages.length > 0
                        ? `Lỗi: ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}`
                        : "Vui lòng kiểm tra lại thông tin nhập liệu.");
                }
                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, messages]) => {
                        form.setError(field as keyof PartFormData, {
                            type: 'server',
                            message: (messages as string[]).join(', '),
                        });
                    });
                    throw new Error("Vui lòng kiểm tra lại thông tin nhập liệu.");
                }
                throw new Error(result.message || result.error || 'Có lỗi xảy ra');
            }

            return result.data || result;
        },
        onSuccess: (response) => {
            onSuccess?.(response as Part);
            initialFormValuesRef.current = form.getValues();

            const data = response as PartWithRelations | undefined;
            if (formMode === 'create' && data?.id) {
                setSavedPartId(data.id);
                setFormMode('edit');
                originalValuesRef.current = {
                    unitCost: data.costs?.unitCost ?? data.unitCost,
                    leadTime: data.planning?.leadTimeDays ?? data.leadTimeDays,
                    minOrderQty: data.planning?.moq ?? data.moq,
                    safetyStock: data.planning?.safetyStock ?? data.safetyStock,
                    reorderPoint: data.planning?.reorderPoint ?? data.reorderPoint,
                    maxStock: data.planning?.maxStock ?? null,
                };
            }

            if (closeAfterSave || isFormComplete) {
                onOpenChange(false);
                setCloseAfterSave(false);
            }
        },
        successMessage: isFormComplete
            ? (formMode === 'edit' ? 'Cập nhật part thành công!' : 'Tạo part thành công!')
            : 'Lưu nháp thành công!',
    });

    // Check if a specific tab has dirty (changed) fields
    const isTabDirty = (tabName: string): boolean => {
        const dirtyFields = form.formState.dirtyFields;
        const tabFieldNames = TAB_FIELDS[tabName] || [];
        return tabFieldNames.some(field => dirtyFields[field]);
    };

    // Get dirty tabs for indicator
    const dirtyTabs = useMemo(() => {
        const dirty: string[] = [];
        Object.keys(TAB_FIELDS).forEach(tab => {
            if (isTabDirty(tab)) {
                dirty.push(tab);
            }
        });
        return dirty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.formState.dirtyFields]);

    // Reset only specific tab's fields to initial values
    const resetTab = (tabName: string) => {
        if (!initialFormValuesRef.current) return;
        const tabFieldNames = TAB_FIELDS[tabName] || [];
        const currentValues = form.getValues();
        const initialValues = initialFormValuesRef.current;

        const resetData = { ...currentValues };
        tabFieldNames.forEach(field => {
            (resetData as Record<string, unknown>)[field] = initialValues[field];
        });

        form.reset(resetData, { keepDirty: true, keepDirtyValues: false });
    };

    // Handle submit with impact checking for edits
    const handleSubmitWithImpactCheck = async (data: PartFormData) => {
        if (!isEditing || !savedPartId || !originalValuesRef.current) {
            performSave(data);
            return;
        }

        const changes = detectChanges(
            originalValuesRef.current,
            data as unknown as Record<string, unknown>,
            PART_FORM_FIELD_CONFIG
        );

        if (changes.length === 0) {
            performSave(data);
            return;
        }

        setPendingSubmitData(data);
        await changeImpact.checkImpact('part', savedPartId, changes);
    };

    // Handle draft save (bypasses full validation, only requires partNumber)
    const handleDraftSave = async () => {
        const partNumber = form.getValues('partNumber');
        if (!partNumber?.trim()) {
            form.setError('partNumber', { type: 'manual', message: 'Mã part là bắt buộc để lưu nháp' });
            setActiveTab('basic');
            return;
        }
        setCloseAfterSave(false);
        const data = form.getValues();
        if (!data.name?.trim()) {
            data.name = `[Nháp] ${partNumber}`;
        }
        performSave(data);
    };

    // 3. Reset form when Modal opens or Part changes
    useEffect(() => {
        if (open) {
            if (part) {
                const extPart = part as PartWithRelations;
                const planning = extPart.planning;
                const costs = extPart.costs;
                const specs = extPart.specs;
                const compliance = extPart.compliance;

                form.reset({
                    partNumber: part.partNumber,
                    name: part.name,
                    description: part.description || '',
                    category: part.category as PartFormData['category'],
                    subCategory: extPart.subCategory ?? null,
                    partType: extPart.partType ?? null,
                    unit: part.unit,
                    unitCost: costs?.unitCost ?? part.unitCost ?? 0,
                    standardCost: costs?.standardCost ?? extPart.standardCost ?? null,
                    averageCost: costs?.averageCost ?? extPart.averageCost ?? null,
                    landedCost: costs?.landedCost ?? extPart.landedCost ?? null,
                    freightPercent: costs?.freightPercent ?? extPart.freightPercent ?? null,
                    dutyPercent: costs?.dutyPercent ?? extPart.dutyPercent ?? null,
                    overheadPercent: costs?.overheadPercent ?? extPart.overheadPercent ?? null,
                    priceBreakQty1: costs?.priceBreakQty1 ?? extPart.priceBreakQty1 ?? null,
                    priceBreakCost1: costs?.priceBreakCost1 ?? extPart.priceBreakCost1 ?? null,
                    priceBreakQty2: costs?.priceBreakQty2 ?? extPart.priceBreakQty2 ?? null,
                    priceBreakCost2: costs?.priceBreakCost2 ?? extPart.priceBreakCost2 ?? null,
                    priceBreakQty3: costs?.priceBreakQty3 ?? extPart.priceBreakQty3 ?? null,
                    priceBreakCost3: costs?.priceBreakCost3 ?? extPart.priceBreakCost3 ?? null,
                    weightKg: specs?.weightKg ?? part.weightKg ?? null,
                    lengthMm: specs?.lengthMm ?? part.lengthMm ?? null,
                    widthMm: specs?.widthMm ?? part.widthMm ?? null,
                    heightMm: specs?.heightMm ?? part.heightMm ?? null,
                    volumeCm3: specs?.volumeCm3 ?? extPart.volumeCm3 ?? null,
                    material: specs?.material ?? part.material ?? '',
                    color: specs?.color ?? part.color ?? '',
                    primarySupplierId: extPart.partSuppliers?.[0]?.supplierId ?? extPart.primarySupplierId ?? null,
                    secondarySupplierIds: extPart.partSuppliers?.slice(1)?.map((ps) => ps.supplierId) ?? [],
                    makeOrBuy: (planning?.makeOrBuy ?? part.makeOrBuy ?? 'BUY') as 'MAKE' | 'BUY' | 'BOTH',
                    procurementType: planning?.procurementType ?? part.procurementType ?? '',
                    buyerCode: planning?.buyerCode ?? extPart.buyerCode ?? null,
                    leadTimeDays: planning?.leadTimeDays ?? part.leadTimeDays ?? 0,
                    moq: planning?.moq ?? part.moq ?? 1,
                    orderMultiple: planning?.orderMultiple ?? part.orderMultiple ?? null,
                    standardPack: planning?.standardPack ?? extPart.standardPack ?? null,
                    minStockLevel: planning?.minStockLevel ?? part.minStockLevel ?? 0,
                    reorderPoint: planning?.reorderPoint ?? part.reorderPoint ?? 0,
                    maxStock: planning?.maxStock ?? null,
                    safetyStock: planning?.safetyStock ?? part.safetyStock ?? null,
                    isCritical: part.isCritical ?? false,
                    countryOfOrigin: compliance?.countryOfOrigin ?? part.countryOfOrigin ?? '',
                    hsCode: compliance?.hsCode ?? extPart.hsCode ?? null,
                    eccn: compliance?.eccn ?? extPart.eccn ?? null,
                    ndaaCompliant: compliance?.ndaaCompliant ?? part.ndaaCompliant ?? true,
                    itarControlled: compliance?.itarControlled ?? part.itarControlled ?? false,
                    rohsCompliant: compliance?.rohsCompliant ?? part.rohsCompliant ?? true,
                    reachCompliant: compliance?.reachCompliant ?? part.reachCompliant ?? true,
                    lotControl: extPart.lotControl ?? false,
                    serialControl: extPart.serialControl ?? false,
                    shelfLifeDays: extPart.shelfLifeDays ?? null,
                    inspectionRequired: extPart.inspectionRequired ?? true,
                    inspectionPlan: extPart.inspectionPlan ?? null,
                    aqlLevel: extPart.aqlLevel ?? null,
                    certificateRequired: extPart.certificateRequired ?? false,
                    revision: part.revision ?? 'A',
                    revisionDate: part.revisionDate ? new Date(part.revisionDate).toISOString().split('T')[0] : null,
                    drawingNumber: specs?.drawingNumber ?? part.drawingNumber ?? '',
                    drawingUrl: specs?.drawingUrl ?? extPart.drawingUrl ?? null,
                    datasheetUrl: specs?.datasheetUrl ?? extPart.datasheetUrl ?? null,
                    manufacturer: specs?.manufacturer ?? part.manufacturer ?? '',
                    manufacturerPn: specs?.manufacturerPn ?? part.manufacturerPn ?? '',
                    lifecycleStatus: (part.lifecycleStatus ?? 'ACTIVE') as PartFormData['lifecycleStatus'],
                });
                originalValuesRef.current = {
                    unitCost: costs?.unitCost ?? extPart.unitCost,
                    leadTime: planning?.leadTimeDays ?? extPart.leadTimeDays,
                    minOrderQty: planning?.moq ?? extPart.moq,
                    safetyStock: planning?.safetyStock ?? extPart.safetyStock,
                    reorderPoint: planning?.reorderPoint ?? extPart.reorderPoint,
                    maxStock: planning?.maxStock ?? null,
                };
                initialFormValuesRef.current = form.getValues();
            } else {
                form.reset(defaultPartValues);
                originalValuesRef.current = null;
                initialFormValuesRef.current = { ...defaultPartValues };
            }
            changeImpact.reset();
            setPendingSubmitData(null);
            setActiveTab('basic');
            setSavedTabs(new Set());

            setFormMode(part ? 'edit' : 'create');
            setSavedPartId(part?.id ?? null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, part, form]);

    // Fetch suppliers list when dialog opens
    useEffect(() => {
        if (open) {
            fetch('/api/suppliers?limit=100')
                .then(res => res.json())
                .then(result => {
                    const items = result.data || result.items || [];
                    setSuppliers(items.map((s: { id: string; name: string; code: string }) => ({ id: s.id, name: s.name, code: s.code })));
                })
                .catch(err => clientLogger.error('Failed to fetch suppliers', err));
        }
    }, [open]);

    // Fetch manufacturers list when dialog opens
    useEffect(() => {
        if (open) {
            fetch('/api/parts/manufacturers')
                .then(res => res.json())
                .then(result => {
                    const items = result.data || [];
                    setManufacturers(items.map((m: string, i: number) => ({
                        value: m,
                        label: `MFR-${String(i + 1).padStart(3, '0')} | ${m}`,
                    })));
                })
                .catch(err => clientLogger.error('Failed to fetch manufacturers', err));
        }
    }, [open]);

    const openSupplierDialog = () => {
        setSupplierDialogOpen(true);
    };

    const handleSupplierCreated = (supplier: SupplierRecord) => {
        setSuppliers(prev => [...prev, supplier]);
    };

    const handleOpenSupplierPicker = (matches: SupplierRecord[]) => {
        setMatchingSuppliers(matches);
        setSupplierPickerOpen(true);
    };

    const handleCloseSupplierPicker = () => {
        setSupplierPickerOpen(false);
        setMatchingSuppliers([]);
    };

    return (
        <>
        <FormModal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={
                isEditing
                    ? `Chỉnh sửa Part: ${savedPartId || part?.partNumber || ''}`
                    : 'Thêm Part mới'
            }
            description={
                isEditing
                    ? 'Cập nhật thông tin part. Tiếp tục nhập các tab khác.'
                    : 'Điền thông tin để tạo part mới'
            }
            isSubmitting={isSubmitting || changeImpact.loading}
            onSubmit={form.handleSubmit(handleSubmitWithImpactCheck)}
            maxWidth="4xl"
            customFooter={
                <PartFormDialogFooter
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    isFormComplete={isFormComplete}
                    isCurrentTabComplete={isCurrentTabComplete}
                    isLastTab={isLastTab}
                    canSaveDraft={canSaveDraft}
                    changeImpactLoading={changeImpact.loading}
                    nextTabName={nextTabName}
                    onClose={() => onOpenChange(false)}
                    onDraftSave={handleDraftSave}
                    onSave={() => form.handleSubmit(handleSubmitWithImpactCheck)()}
                    onNextTab={goToNextTab}
                />
            }
        >
            <Form {...form}>
                <form className="space-y-4">
                    <PartFormDialogTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        dirtyTabs={dirtyTabs}
                        isEditing={isEditing}
                        isSubmitting={isSubmitting}
                        isTabDirty={isTabDirty}
                        onResetTab={resetTab}
                        suppliers={suppliers}
                        manufacturers={manufacturers}
                        onOpenSupplierDialog={openSupplierDialog}
                        onOpenSupplierPicker={handleOpenSupplierPicker}
                        savedPartId={savedPartId}
                        formMode={formMode}
                        part={part}
                        changeImpactLoading={changeImpact.loading}
                    />
                </form>
            </Form>
        </FormModal>

        {/* Change Impact Dialog */}
        <ChangeImpactDialog
            open={changeImpact.showDialog}
            onOpenChange={changeImpact.setShowDialog}
            result={changeImpact.result}
            loading={changeImpact.loading}
            onConfirm={changeImpact.confirm}
            onCancel={changeImpact.cancel}
        />

        {/* Create Supplier Dialog */}
        <CreateSupplierDialog
            open={supplierDialogOpen}
            onOpenChange={setSupplierDialogOpen}
            form={form}
            onSupplierCreated={handleSupplierCreated}
        />

        {/* Supplier picker when multiple suppliers match manufacturer name */}
        <SupplierPickerDialog
            open={supplierPickerOpen}
            onOpenChange={setSupplierPickerOpen}
            matchingSuppliers={matchingSuppliers}
            manufacturerName={form.watch('manufacturer') || ''}
            form={form}
            onClose={handleCloseSupplierPicker}
        />
        </>
    );
}
