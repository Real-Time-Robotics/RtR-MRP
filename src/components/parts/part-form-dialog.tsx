
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormModal } from '@/components/ui-v2/form-modal';
import { useDataEntry } from '@/hooks/use-data-entry';
import { Part } from '@/components/forms/part-form'; // Keep using the Part interface from here for now
import {
    ChangeImpactDialog,
    useChangeImpact,
    detectChanges,
    PART_FORM_FIELD_CONFIG,
} from '@/components/change-impact';
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
import { NumberInput } from '@/components/ui/number-input';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Save, CheckCircle2, FilePenLine, ChevronRight } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import {
    partSchema,
    PartFormData,
    defaultPartValues,
    CATEGORIES,
    CATEGORY_LABELS,
    UNITS,
    COUNTRIES
} from './part-form-schema';

// Tab order for navigation
const TAB_ORDER = ['basic', 'physical', 'engineering', 'procurement', 'quality', 'compliance'] as const;

// Define which fields belong to which tab
const TAB_FIELDS: Record<string, (keyof PartFormData)[]> = {
    basic: ['partNumber', 'name', 'description', 'category', 'subCategory', 'partType', 'unit', 'unitCost', 'standardCost', 'averageCost', 'landedCost', 'freightPercent', 'dutyPercent', 'overheadPercent', 'priceBreakQty1', 'priceBreakCost1', 'priceBreakQty2', 'priceBreakCost2', 'priceBreakQty3', 'priceBreakCost3', 'isCritical'],
    physical: ['weightKg', 'lengthMm', 'widthMm', 'heightMm', 'volumeCm3', 'material', 'color'],
    engineering: ['revision', 'revisionDate', 'drawingNumber', 'drawingUrl', 'datasheetUrl', 'manufacturer', 'manufacturerPn', 'lifecycleStatus'],
    procurement: ['primarySupplierId', 'makeOrBuy', 'procurementType', 'buyerCode', 'leadTimeDays', 'moq', 'orderMultiple', 'standardPack', 'minStockLevel', 'reorderPoint', 'safetyStock', 'maxStock'],
    compliance: ['countryOfOrigin', 'hsCode', 'eccn', 'ndaaCompliant', 'itarControlled', 'rohsCompliant', 'reachCompliant'],
    quality: ['lotControl', 'serialControl', 'shelfLifeDays', 'inspectionRequired', 'inspectionPlan', 'aqlLevel', 'certificateRequired'],
};

// Required fields per tab (fields that must be filled before moving to next tab)
const TAB_REQUIRED_FIELDS: Record<string, (keyof PartFormData)[]> = {
    basic: ['partNumber', 'name', 'category', 'unit'],
    physical: ['weightKg'],
    engineering: ['manufacturer', 'manufacturerPn'],
    procurement: ['primarySupplierId', 'leadTimeDays', 'moq'],
    quality: [], // All have defaults
    compliance: ['countryOfOrigin'],
};

// Tab display names
const TAB_NAMES: Record<string, string> = {
    basic: 'Cơ bản',
    physical: 'Vật lý',
    engineering: 'Kỹ thuật',
    procurement: 'Mua hàng',
    quality: 'Chất lượng',
    compliance: 'Tuân thủ',
};

interface PartFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    part?: Part | null;
    onSuccess?: (part: Part) => void;
}

export function PartFormDialog({ open, onOpenChange, part, onSuccess }: PartFormDialogProps) {
    // Track form mode: 'create' or 'edit'
    // After first save in create mode, switch to edit mode
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

    // Track if we should close after save (for "Save & Close" action)
    const [closeAfterSave, setCloseAfterSave] = useState(false);

    // Suppliers list for dropdown
    const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string; code: string }>>([]);

    // Manufacturers list for dropdown
    const [manufacturers, setManufacturers] = useState<ComboboxOption[]>([]);

    // 1. Setup Form Hook
    const form = useForm<PartFormData>({
        resolver: zodResolver(partSchema) as any,
        defaultValues: defaultPartValues,
    });

    // Watch required fields to determine form completeness
    // Basic tab
    const watchedPartNumber = form.watch('partNumber');
    const watchedName = form.watch('name');
    const watchedCategory = form.watch('category');
    const watchedUnit = form.watch('unit');
    // Physical tab
    const watchedWeightKg = form.watch('weightKg');
    // Engineering tab
    const watchedManufacturer = form.watch('manufacturer');
    const watchedManufacturerPn = form.watch('manufacturerPn');
    // Procurement tab
    const watchedPrimarySupplierId = form.watch('primarySupplierId');
    const watchedLeadTimeDays = form.watch('leadTimeDays');
    const watchedMoq = form.watch('moq');
    // Compliance tab
    const watchedCountryOfOrigin = form.watch('countryOfOrigin');

    // Check if a specific tab's required fields are filled
    const isTabComplete = (tabName: string): boolean => {
        const requiredFields = TAB_REQUIRED_FIELDS[tabName] || [];
        if (requiredFields.length === 0) return true;

        const values = form.getValues();
        return requiredFields.every((field) => {
            const value = values[field];
            if (typeof value === 'string') return value.trim() !== '';
            // For numbers: leadTimeDays can be 0, moq must be >= 1, weightKg must be > 0
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
            // After user confirms impact, proceed with actual save
            if (pendingSubmitData) {
                performSave(pendingSubmitData);
            }
        },
        onError: (error) => {
            console.error('Change impact error:', error);
            // Still allow save if impact check fails
            if (pendingSubmitData) {
                performSave(pendingSubmitData);
            }
        },
    });

    // 2. Setup Data Entry Hook
    const { submit: performSave, isSubmitting } = useDataEntry<PartFormData>({
        onSubmit: async (data: PartFormData) => {
            // Clean data: convert empty strings to null, ensure numbers are numbers
            // API needs to receive all fields to properly update nested relations
            const cleanData: Record<string, unknown> = {};

            // Number fields that must be sent as numbers (not null/undefined)
            const requiredNumberFields = ['unitCost', 'leadTimeDays', 'moq', 'minStockLevel', 'reorderPoint'];
            const optionalNumberFields = ['weightKg', 'lengthMm', 'widthMm', 'heightMm', 'volumeCm3', 'orderMultiple', 'standardPack', 'maxStock', 'safetyStock', 'shelfLifeDays', 'standardCost', 'averageCost', 'landedCost', 'freightPercent', 'dutyPercent', 'overheadPercent', 'priceBreakQty1', 'priceBreakCost1', 'priceBreakQty2', 'priceBreakCost2', 'priceBreakQty3', 'priceBreakCost3'];

            Object.entries(data).forEach(([key, value]) => {
                // Convert empty strings to null
                if (value === '' || value === undefined) {
                    // For required number fields, use 0 instead of null
                    if (requiredNumberFields.includes(key)) {
                        cleanData[key] = 0;
                    } else {
                        cleanData[key] = null;
                    }
                } else if (typeof value === 'string' && (requiredNumberFields.includes(key) || optionalNumberFields.includes(key))) {
                    // Convert string numbers to actual numbers
                    const num = parseFloat(value);
                    cleanData[key] = isNaN(num) ? (requiredNumberFields.includes(key) ? 0 : null) : num;
                } else {
                    cleanData[key] = value;
                }
            });

            console.log('=== SUBMITTING FORM DATA ===');
            console.log('Form Mode:', formMode, '| Saved Part ID:', savedPartId);
            console.log(JSON.stringify(cleanData, null, 2));

            // Use savedPartId for edit mode (handles case when part was just created)
            const url = isEditing ? `/api/parts/${savedPartId}` : '/api/parts';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanData),
            });

            const result = await response.json();

            if (!response.ok) {
                // Handle Validation Errors from Server
                // Backend returns: { error: "Validation failed", details: [{ field, message }] }
                // Also handle legacy format: { errors: { field: [messages] } }
                if (result.details && Array.isArray(result.details)) {
                    // New format from backend validation.ts
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
                    console.error('Validation errors:', errorMessages);
                    throw new Error(errorMessages.length > 0
                        ? `Lỗi: ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}`
                        : "Vui lòng kiểm tra lại thông tin nhập liệu.");
                }
                if (result.errors) {
                    // Legacy format
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
        onSuccess: (data) => {
            onSuccess?.(data);
            // Update initial values after successful save (so "Reset Tab" resets to saved state)
            initialFormValuesRef.current = form.getValues();

            // CRITICAL FIX: After first CREATE, switch to EDIT mode
            // This prevents "Part already exists" error when saving subsequent tabs
            if (formMode === 'create' && data?.id) {
                console.log('=== SWITCHING TO EDIT MODE ===');
                console.log('New Part ID:', data.id);
                setSavedPartId(data.id);
                setFormMode('edit');
                // Store original values for change impact detection
                originalValuesRef.current = {
                    unitCost: data.costs?.unitCost ?? data.unitCost,
                    leadTime: data.planning?.leadTimeDays ?? data.leadTimeDays,
                    minOrderQty: data.planning?.moq ?? data.moq,
                    safetyStock: data.planning?.safetyStock ?? data.safetyStock,
                    reorderPoint: data.planning?.reorderPoint ?? data.reorderPoint,
                    maxStock: data.planning?.maxStock ?? null,
                };
            }

            // Close dialog after successful save if form is complete
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

        // Create reset object with only the tab's fields
        const resetData = { ...currentValues };
        tabFieldNames.forEach(field => {
            (resetData as Record<string, unknown>)[field] = initialValues[field];
        });

        form.reset(resetData, { keepDirty: true, keepDirtyValues: false });
    };

    // Handle submit with impact checking for edits
    const handleSubmitWithImpactCheck = async (data: PartFormData) => {
        // For new parts (not yet saved), just save directly
        if (!isEditing || !savedPartId || !originalValuesRef.current) {
            performSave(data);
            return;
        }

        // Detect changes in impactable fields
        const changes = detectChanges(
            originalValuesRef.current,
            data as unknown as Record<string, unknown>,
            PART_FORM_FIELD_CONFIG
        );

        // If no impactable fields changed, save directly
        if (changes.length === 0) {
            performSave(data);
            return;
        }

        // Store pending data and check impact
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
        // Set defaults for API-required fields that may be empty in draft
        if (!data.name?.trim()) {
            data.name = `[Nháp] ${partNumber}`;
        }
        performSave(data);
    };

    // 3. Reset form when Modal opens or Part changes
    useEffect(() => {
        if (open) {
            if (part) {
                // Map Part to PartFormData
                // IMPORTANT: Read from nested relations (planning, costs, specs, compliance) when available
                // Fall back to root-level fields for backwards compatibility
                const planning = (part as any).planning;
                const costs = (part as any).costs;
                const specs = (part as any).specs;
                const compliance = (part as any).compliance;

                form.reset({
                    partNumber: part.partNumber,
                    name: part.name,
                    description: part.description || '',
                    category: part.category as PartFormData['category'],
                    subCategory: (part as any).subCategory ?? null,
                    partType: (part as any).partType ?? null,
                    unit: part.unit,
                    // Cost: prefer nested, fallback to root
                    unitCost: costs?.unitCost ?? part.unitCost ?? 0,
                    standardCost: costs?.standardCost ?? (part as any).standardCost ?? null,
                    averageCost: costs?.averageCost ?? (part as any).averageCost ?? null,
                    landedCost: costs?.landedCost ?? (part as any).landedCost ?? null,
                    freightPercent: costs?.freightPercent ?? (part as any).freightPercent ?? null,
                    dutyPercent: costs?.dutyPercent ?? (part as any).dutyPercent ?? null,
                    overheadPercent: costs?.overheadPercent ?? (part as any).overheadPercent ?? null,
                    priceBreakQty1: costs?.priceBreakQty1 ?? (part as any).priceBreakQty1 ?? null,
                    priceBreakCost1: costs?.priceBreakCost1 ?? (part as any).priceBreakCost1 ?? null,
                    priceBreakQty2: costs?.priceBreakQty2 ?? (part as any).priceBreakQty2 ?? null,
                    priceBreakCost2: costs?.priceBreakCost2 ?? (part as any).priceBreakCost2 ?? null,
                    priceBreakQty3: costs?.priceBreakQty3 ?? (part as any).priceBreakQty3 ?? null,
                    priceBreakCost3: costs?.priceBreakCost3 ?? (part as any).priceBreakCost3 ?? null,
                    // Physical: prefer nested specs, fallback to root
                    weightKg: specs?.weightKg ?? part.weightKg ?? null,
                    lengthMm: specs?.lengthMm ?? part.lengthMm ?? null,
                    widthMm: specs?.widthMm ?? part.widthMm ?? null,
                    heightMm: specs?.heightMm ?? part.heightMm ?? null,
                    volumeCm3: specs?.volumeCm3 ?? (part as any).volumeCm3 ?? null,
                    material: specs?.material ?? part.material ?? '',
                    color: specs?.color ?? part.color ?? '',
                    // Procurement: prefer nested planning, fallback to root
                    primarySupplierId: (part as any).partSuppliers?.[0]?.supplierId ?? (part as any).primarySupplierId ?? null,
                    makeOrBuy: (planning?.makeOrBuy ?? part.makeOrBuy ?? 'BUY') as 'MAKE' | 'BUY' | 'BOTH',
                    procurementType: planning?.procurementType ?? part.procurementType ?? '',
                    buyerCode: planning?.buyerCode ?? (part as any).buyerCode ?? null,
                    leadTimeDays: planning?.leadTimeDays ?? part.leadTimeDays ?? 0,
                    moq: planning?.moq ?? part.moq ?? 1,
                    orderMultiple: planning?.orderMultiple ?? part.orderMultiple ?? null,
                    standardPack: planning?.standardPack ?? (part as any).standardPack ?? null,
                    // Inventory: prefer nested planning, fallback to root
                    minStockLevel: planning?.minStockLevel ?? part.minStockLevel ?? 0,
                    reorderPoint: planning?.reorderPoint ?? part.reorderPoint ?? 0,
                    maxStock: planning?.maxStock ?? null,
                    safetyStock: planning?.safetyStock ?? part.safetyStock ?? null,
                    isCritical: part.isCritical ?? false,
                    // Compliance: prefer nested compliance, fallback to root
                    countryOfOrigin: compliance?.countryOfOrigin ?? part.countryOfOrigin ?? '',
                    hsCode: compliance?.hsCode ?? (part as any).hsCode ?? null,
                    eccn: compliance?.eccn ?? (part as any).eccn ?? null,
                    ndaaCompliant: compliance?.ndaaCompliant ?? part.ndaaCompliant ?? true,
                    itarControlled: compliance?.itarControlled ?? part.itarControlled ?? false,
                    rohsCompliant: compliance?.rohsCompliant ?? part.rohsCompliant ?? true,
                    reachCompliant: compliance?.reachCompliant ?? part.reachCompliant ?? true,
                    // Quality Control
                    lotControl: (part as any).lotControl ?? false,
                    serialControl: (part as any).serialControl ?? false,
                    shelfLifeDays: (part as any).shelfLifeDays ?? null,
                    inspectionRequired: (part as any).inspectionRequired ?? true,
                    inspectionPlan: (part as any).inspectionPlan ?? null,
                    aqlLevel: (part as any).aqlLevel ?? null,
                    certificateRequired: (part as any).certificateRequired ?? false,
                    // Engineering
                    revision: part.revision ?? 'A',
                    revisionDate: part.revisionDate ? new Date(part.revisionDate).toISOString().split('T')[0] : null,
                    drawingNumber: specs?.drawingNumber ?? part.drawingNumber ?? '',
                    drawingUrl: specs?.drawingUrl ?? (part as any).drawingUrl ?? null,
                    datasheetUrl: specs?.datasheetUrl ?? (part as any).datasheetUrl ?? null,
                    manufacturer: specs?.manufacturer ?? part.manufacturer ?? '',
                    manufacturerPn: specs?.manufacturerPn ?? part.manufacturerPn ?? '',
                    lifecycleStatus: (part.lifecycleStatus ?? 'ACTIVE') as PartFormData['lifecycleStatus'],
                });
                // Store original values for change impact detection
                originalValuesRef.current = {
                    unitCost: costs?.unitCost ?? part.unitCost,
                    leadTime: planning?.leadTimeDays ?? part.leadTimeDays,
                    minOrderQty: planning?.moq ?? part.moq,
                    safetyStock: planning?.safetyStock ?? part.safetyStock,
                    reorderPoint: planning?.reorderPoint ?? part.reorderPoint,
                    maxStock: planning?.maxStock ?? null,
                };
                // Store initial form values for tab reset
                initialFormValuesRef.current = form.getValues();
            } else {
                form.reset(defaultPartValues);
                originalValuesRef.current = null;
                initialFormValuesRef.current = { ...defaultPartValues };
            }
            // Reset change impact state and tab states
            changeImpact.reset();
            setPendingSubmitData(null);
            setActiveTab('basic');
            setSavedTabs(new Set());

            // Reset form mode based on whether we're editing existing part
            setFormMode(part ? 'edit' : 'create');
            setSavedPartId(part?.id ?? null);
        }
    // Note: Only depend on changeImpact.reset (stable callback), not the whole object
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, part, form]);

    // Fetch suppliers list when dialog opens
    useEffect(() => {
        if (open) {
            fetch('/api/suppliers?limit=100')
                .then(res => res.json())
                .then(result => {
                    const items = result.data || result.items || [];
                    setSuppliers(items.map((s: any) => ({ id: s.id, name: s.name, code: s.code })));
                })
                .catch(err => console.error('Failed to fetch suppliers:', err));
        }
    }, [open]);

    // Fetch manufacturers list when dialog opens
    useEffect(() => {
        if (open) {
            fetch('/api/parts/manufacturers')
                .then(res => res.json())
                .then(result => {
                    const items = result.data || [];
                    setManufacturers(items.map((m: string) => ({ value: m, label: m })));
                })
                .catch(err => console.error('Failed to fetch manufacturers:', err));
        }
    }, [open]);

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
                <div className="flex justify-between w-full">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting || changeImpact.loading}
                    >
                        Hủy
                    </Button>
                    <div className="flex gap-2">
                        {/* Show "Lưu nháp" when form is not complete and partNumber exists */}
                        {!isFormComplete && canSaveDraft && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDraftSave}
                                disabled={isSubmitting || changeImpact.loading}
                            >
                                {(isSubmitting || changeImpact.loading) && (
                                    <FilePenLine className="h-4 w-4 mr-1 animate-spin" />
                                )}
                                Lưu nháp
                            </Button>
                        )}

                        {/* Main action button: "Tiếp theo" or "Lưu" */}
                        {isFormComplete ? (
                            // All required fields filled - show Save button
                            <Button
                                type="button"
                                onClick={() => form.handleSubmit(handleSubmitWithImpactCheck)()}
                                disabled={isSubmitting || changeImpact.loading}
                            >
                                {(isSubmitting || changeImpact.loading) ? (
                                    <Save className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-1" />
                                )}
                                Lưu
                            </Button>
                        ) : isCurrentTabComplete && !isLastTab ? (
                            // Current tab complete, not last tab - show Next button
                            <Button
                                type="button"
                                onClick={goToNextTab}
                                disabled={isSubmitting || changeImpact.loading}
                            >
                                Tiếp theo: {nextTabName}
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            // Current tab not complete - show disabled button with hint
                            <Button
                                type="button"
                                disabled
                                variant="secondary"
                            >
                                Điền các trường bắt buộc (*)
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            <Form {...form}>
                <form className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        {/* Saved indicator - shows when Part has been created/saved */}
                        {savedPartId && formMode === 'edit' && !part && (
                            <div className="mb-3 flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Part đã lưu: {savedPartId}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Tiếp tục nhập các tab khác
                                </span>
                            </div>
                        )}
                        <TabsList className="grid grid-cols-6 w-full dark:bg-slate-800">
                            <TabsTrigger value="basic">
                                Cơ bản{dirtyTabs.includes('basic') ? ' *' : ''}
                            </TabsTrigger>
                            <TabsTrigger value="physical">
                                Vật lý{dirtyTabs.includes('physical') ? ' *' : ''}
                            </TabsTrigger>
                            <TabsTrigger value="engineering">
                                Kỹ thuật{dirtyTabs.includes('engineering') ? ' *' : ''}
                            </TabsTrigger>
                            <TabsTrigger value="procurement">
                                Mua hàng{dirtyTabs.includes('procurement') ? ' *' : ''}
                            </TabsTrigger>
                            <TabsTrigger value="quality">
                                Chất lượng{dirtyTabs.includes('quality') ? ' *' : ''}
                            </TabsTrigger>
                            <TabsTrigger value="compliance">
                                Tuân thủ{dirtyTabs.includes('compliance') ? ' *' : ''}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <FormField
                                control={form.control}
                                name="partNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mã Part *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="PART-001" {...field} disabled={isEditing} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tên Part *</FormLabel>
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
                                        <FormLabel>Mô tả</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Mô tả chi tiết..." {...field} value={field.value || ''} />
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
                                            <FormLabel>Danh mục *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn danh mục">
                                                            {field.value ? CATEGORY_LABELS[field.value] || field.value : 'Chọn danh mục'}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {CATEGORIES.map((cat) => (
                                                        <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</SelectItem>
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
                                            <FormLabel>Đơn vị *</FormLabel>
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
                                            <FormLabel>Giá (USD) *</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={0}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="standardCost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá chuẩn (USD)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="averageCost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá trung bình (USD)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="landedCost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá nhập kho (USD)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="freightPercent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cước vận chuyển (%)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="dutyPercent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thuế nhập khẩu (%)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="overheadPercent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Chi phí gián tiếp (%)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Chiết khấu theo SL (Price Breaks)</label>
                                <div className="grid grid-cols-6 gap-2">
                                    <FormField
                                        control={form.control}
                                        name="priceBreakQty1"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <NumberInput
                                                        min={0}
                                                        emptyValue={null}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="SL 1"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="priceBreakCost1"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <NumberInput
                                                        min={0}
                                                        allowDecimal={true}
                                                        emptyValue={null}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Giá 1"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="priceBreakQty2"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <NumberInput
                                                        min={0}
                                                        emptyValue={null}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="SL 2"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="priceBreakCost2"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <NumberInput
                                                        min={0}
                                                        allowDecimal={true}
                                                        emptyValue={null}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Giá 2"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="priceBreakQty3"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <NumberInput
                                                        min={0}
                                                        emptyValue={null}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="SL 3"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="priceBreakCost3"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <NumberInput
                                                        min={0}
                                                        allowDecimal={true}
                                                        emptyValue={null}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Giá 3"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="subCategory"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Danh mục phụ</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ví dụ: IC, Resistor..." {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="partType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loại Part</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ví dụ: SMD, Through-hole..." {...field} value={field.value || ''} />
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
                                            <FormLabel>Linh kiện Quan trọng</FormLabel>
                                            <FormDescription>Đánh dấu là part quan trọng</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Tab-level actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetTab('basic')}
                                    disabled={!isTabDirty('basic') || isSubmitting}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reset Tab
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Physical Tab */}
                        <TabsContent value="physical" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="weightKg"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Trọng lượng (kg) *</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
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
                                            <FormLabel>Chất liệu</FormLabel>
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
                                            <FormLabel>Dài (mm)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
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
                                            <FormLabel>Rộng (mm)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
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
                                            <FormLabel>Cao (mm)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
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
                                    name="volumeCm3"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thể tích (cm³)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    allowDecimal={true}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="color"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Màu sắc</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Black, White, Silver..." {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Tab-level actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetTab('physical')}
                                    disabled={!isTabDirty('physical') || isSubmitting}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reset Tab
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Engineering Tab */}
                        <TabsContent value="engineering" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="revision"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phiên bản</FormLabel>
                                            <FormControl>
                                                <Input placeholder="A" {...field} />
                                            </FormControl>
                                            <FormDescription>Phiên bản thiết kế</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="revisionDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ngày cập nhật</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormDescription>Ngày cập nhật phiên bản</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="drawingNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Số bản vẽ</FormLabel>
                                        <FormControl>
                                            <Input placeholder="DWG-001" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormDescription>Số bản vẽ kỹ thuật</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="drawingUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Link bản vẽ</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://..." {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="datasheetUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Link Datasheet</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://..." {...field} value={field.value || ''} />
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
                                            <FormLabel>Nhà sản xuất *</FormLabel>
                                            <FormControl>
                                                <Combobox
                                                    options={manufacturers}
                                                    value={field.value || ''}
                                                    onValueChange={field.onChange}
                                                    placeholder="Chọn nhà sản xuất..."
                                                    searchPlaceholder="Tìm nhà sản xuất..."
                                                    emptyText="Không tìm thấy nhà sản xuất"
                                                />
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
                                            <FormLabel>Mã NSX *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="MPN" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="lifecycleStatus"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Trạng thái</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="DEVELOPMENT">Development</SelectItem>
                                                <SelectItem value="PROTOTYPE">Prototype</SelectItem>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="PHASE_OUT">Phase Out</SelectItem>
                                                <SelectItem value="OBSOLETE">Obsolete</SelectItem>
                                                <SelectItem value="EOL">End of Life</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Trạng thái vòng đời sản phẩm</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Tab-level actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetTab('engineering')}
                                    disabled={!isTabDirty('engineering') || isSubmitting}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reset Tab
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Procurement Tab */}
                        <TabsContent value="procurement" className="space-y-4 mt-4">
                            <FormField
                                control={form.control}
                                name="primarySupplierId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nhà cung cấp chính *</FormLabel>
                                        <FormControl>
                                            <Combobox
                                                options={suppliers.map((s) => ({
                                                    value: s.id,
                                                    label: `${s.code} - ${s.name}`,
                                                }))}
                                                value={field.value || ''}
                                                onValueChange={(val) => field.onChange(val || null)}
                                                placeholder="Chọn nhà cung cấp..."
                                                searchPlaceholder="Tìm nhà cung cấp..."
                                                emptyText="Không tìm thấy nhà cung cấp"
                                                allowCreate={false}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="makeOrBuy"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tự SX/Mua</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MAKE">Tự sản xuất</SelectItem>
                                                    <SelectItem value="BUY">Mua</SelectItem>
                                                    <SelectItem value="BOTH">Cả hai</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="procurementType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Loại mua hàng</FormLabel>
                                            <FormControl>
                                                <Input placeholder="STOCK, MTO..." {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="buyerCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mã người mua</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Buyer code" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="leadTimeDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thời gian giao hàng (ngày) *</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    emptyValue={0}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="standardPack"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Đóng gói tiêu chuẩn</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={1}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
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
                                    name="moq"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SL đặt tối thiểu (MOQ) *</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={1}
                                                    emptyValue={1}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormDescription>Số lượng đặt hàng tối thiểu</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="orderMultiple"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bội số đặt hàng</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={1}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
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
                                    name="minStockLevel"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tồn kho tối thiểu (Min Stock)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    emptyValue={0}
                                                    value={field.value}
                                                    onChange={field.onChange}
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
                                            <FormLabel>Điểm đặt lại</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    emptyValue={0}
                                                    value={field.value}
                                                    onChange={field.onChange}
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
                                            <FormLabel>Tồn kho an toàn</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
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
                                            <FormLabel>Tồn kho tối đa (Max Stock)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Tab-level actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetTab('procurement')}
                                    disabled={!isTabDirty('procurement') || isSubmitting}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reset Tab
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Quality Control Tab */}
                        <TabsContent value="quality" className="space-y-4 mt-4">
                            <div className="space-y-3">
                                <FormField
                                    control={form.control}
                                    name="lotControl"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Kiểm soát Lot</FormLabel>
                                                <FormDescription>Yêu cầu theo dõi theo lô</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="serialControl"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Kiểm soát Serial</FormLabel>
                                                <FormDescription>Yêu cầu theo dõi số serial</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="inspectionRequired"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Yêu cầu kiểm tra</FormLabel>
                                                <FormDescription>Part cần kiểm tra chất lượng khi nhận</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="certificateRequired"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Yêu cầu chứng chỉ</FormLabel>
                                                <FormDescription>Part cần chứng chỉ kèm theo</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="shelfLifeDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hạn sử dụng (ngày)</FormLabel>
                                            <FormControl>
                                                <NumberInput
                                                    min={0}
                                                    emptyValue={null}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="inspectionPlan"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Kế hoạch kiểm tra</FormLabel>
                                            <FormControl>
                                                <Input placeholder="IP-001" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="aqlLevel"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mức AQL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="II" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormDescription>Acceptable Quality Level</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Tab-level actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetTab('quality')}
                                    disabled={!isTabDirty('quality') || isSubmitting}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reset Tab
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Compliance Tab */}
                        <TabsContent value="compliance" className="space-y-4 mt-4">
                            <FormField
                                control={form.control}
                                name="countryOfOrigin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Xuất xứ *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn quốc gia" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {COUNTRIES.map((c) => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>Quốc gia sản xuất</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="hsCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mã HS</FormLabel>
                                            <FormControl>
                                                <Input placeholder="8542.31" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormDescription>Harmonized System Code</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="eccn"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ECCN</FormLabel>
                                            <FormControl>
                                                <Input placeholder="EAR99" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormDescription>Export Control Classification</FormDescription>
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
                                                <FormLabel>Tuân thủ NDAA</FormLabel>
                                                <FormDescription>Section 889 compliant</FormDescription>
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
                                                <FormLabel>Kiểm soát ITAR</FormLabel>
                                                <FormDescription>Export controlled item</FormDescription>
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
                                                <FormLabel>Tuân thủ RoHS</FormLabel>
                                                <FormDescription>Restriction of Hazardous Substances</FormDescription>
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
                                                <FormLabel>Tuân thủ REACH</FormLabel>
                                                <FormDescription>EU Chemicals Regulation</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Tab-level actions */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resetTab('compliance')}
                                    disabled={!isTabDirty('compliance') || isSubmitting}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reset Tab
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
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
        </>
    );
}
