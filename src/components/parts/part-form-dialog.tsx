
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
import { RotateCcw, Save, CheckCircle2 } from 'lucide-react';
import {
    partSchema,
    PartFormData,
    defaultPartValues,
    CATEGORIES,
    CATEGORY_LABELS,
    UNITS,
    COUNTRIES
} from './part-form-schema';

// Define which fields belong to which tab
const TAB_FIELDS: Record<string, (keyof PartFormData)[]> = {
    basic: ['partNumber', 'name', 'description', 'category', 'unit', 'unitCost', 'isCritical'],
    physical: ['weightKg', 'lengthMm', 'widthMm', 'heightMm', 'material', 'color'],
    engineering: ['revision', 'revisionDate', 'drawingNumber', 'manufacturer', 'manufacturerPn', 'lifecycleStatus'],
    procurement: ['makeOrBuy', 'leadTimeDays', 'moq', 'orderMultiple', 'minStockLevel', 'reorderPoint', 'safetyStock', 'maxStock'],
    compliance: ['countryOfOrigin', 'ndaaCompliant', 'itarControlled', 'rohsCompliant', 'reachCompliant'],
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

    // 1. Setup Form Hook
    const form = useForm<PartFormData>({
        resolver: zodResolver(partSchema) as any,
        defaultValues: defaultPartValues,
    });

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
            const optionalNumberFields = ['weightKg', 'lengthMm', 'widthMm', 'heightMm', 'orderMultiple', 'maxStock', 'safetyStock'];

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

            // Only close if closeAfterSave is true
            if (closeAfterSave) {
                onOpenChange(false);
                setCloseAfterSave(false);
            }
        },
        successMessage: formMode === 'edit' ? 'Cập nhật part thành công!' : 'Tạo part thành công!',
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
                    unit: part.unit,
                    // Cost: prefer nested, fallback to root
                    unitCost: costs?.unitCost ?? part.unitCost ?? 0,
                    // Physical: prefer nested specs, fallback to root
                    weightKg: specs?.weightKg ?? part.weightKg ?? null,
                    lengthMm: specs?.lengthMm ?? part.lengthMm ?? null,
                    widthMm: specs?.widthMm ?? part.widthMm ?? null,
                    heightMm: specs?.heightMm ?? part.heightMm ?? null,
                    material: specs?.material ?? part.material ?? '',
                    color: specs?.color ?? part.color ?? '',
                    // Procurement: prefer nested planning, fallback to root
                    makeOrBuy: (planning?.makeOrBuy ?? part.makeOrBuy ?? 'BUY') as 'MAKE' | 'BUY' | 'BOTH',
                    procurementType: planning?.procurementType ?? part.procurementType ?? '',
                    leadTimeDays: planning?.leadTimeDays ?? part.leadTimeDays ?? 0,
                    moq: planning?.moq ?? part.moq ?? 1,
                    orderMultiple: planning?.orderMultiple ?? part.orderMultiple ?? null,
                    // Inventory: prefer nested planning, fallback to root
                    minStockLevel: planning?.minStockLevel ?? part.minStockLevel ?? 0,
                    reorderPoint: planning?.reorderPoint ?? part.reorderPoint ?? 0,
                    maxStock: planning?.maxStock ?? null, // maxStock ONLY exists in planning
                    safetyStock: planning?.safetyStock ?? part.safetyStock ?? null,
                    isCritical: part.isCritical ?? false,
                    // Compliance: prefer nested compliance, fallback to root
                    countryOfOrigin: compliance?.countryOfOrigin ?? part.countryOfOrigin ?? '',
                    ndaaCompliant: compliance?.ndaaCompliant ?? part.ndaaCompliant ?? true,
                    itarControlled: compliance?.itarControlled ?? part.itarControlled ?? false,
                    rohsCompliant: compliance?.rohsCompliant ?? part.rohsCompliant ?? true,
                    reachCompliant: compliance?.reachCompliant ?? part.reachCompliant ?? true,
                    // Engineering
                    revision: part.revision ?? 'A',
                    revisionDate: part.revisionDate ? new Date(part.revisionDate).toISOString().split('T')[0] : null,
                    drawingNumber: specs?.drawingNumber ?? part.drawingNumber ?? '',
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
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setCloseAfterSave(false);
                                form.handleSubmit(handleSubmitWithImpactCheck)();
                            }}
                            disabled={isSubmitting || changeImpact.loading}
                        >
                            {(isSubmitting || changeImpact.loading) && !closeAfterSave && (
                                <Save className="h-4 w-4 mr-1 animate-spin" />
                            )}
                            Lưu
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setCloseAfterSave(true);
                                form.handleSubmit(handleSubmitWithImpactCheck)();
                            }}
                            disabled={isSubmitting || changeImpact.loading}
                        >
                            {(isSubmitting || changeImpact.loading) && closeAfterSave && (
                                <Save className="h-4 w-4 mr-1 animate-spin" />
                            )}
                            Lưu & Đóng
                        </Button>
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
                                    Part da luu: {savedPartId}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Tiep tuc nhap cac tab khac
                                </span>
                            </div>
                        )}
                        <TabsList className="grid grid-cols-5 w-full dark:bg-slate-800">
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
                                            <FormLabel>Trọng lượng (kg)</FormLabel>
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
                                    name="manufacturer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nhà sản xuất</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nhà sản xuất" {...field} value={field.value || ''} />
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
                                            <FormLabel>Mã NSX</FormLabel>
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
                            <div className="grid grid-cols-2 gap-4">
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
                                    name="leadTimeDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thời gian giao hàng (ngày)</FormLabel>
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
                                    name="moq"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>SL đặt tối thiểu (MOQ)</FormLabel>
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

                        {/* Compliance Tab */}
                        <TabsContent value="compliance" className="space-y-4 mt-4">
                            <FormField
                                control={form.control}
                                name="countryOfOrigin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Xuất xứ</FormLabel>
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
