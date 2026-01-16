
import React, { useEffect, useState, useRef } from 'react';
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
import {
    partSchema,
    PartFormData,
    defaultPartValues,
    CATEGORIES,
    CATEGORY_LABELS,
    UNITS,
    COUNTRIES
} from './part-form-schema';

interface PartFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    part?: Part | null;
    onSuccess?: (part: Part) => void;
}

export function PartFormDialog({ open, onOpenChange, part, onSuccess }: PartFormDialogProps) {
    const isEditing = !!part;

    // Store original values for change detection
    const originalValuesRef = useRef<Record<string, unknown> | null>(null);
    const [pendingSubmitData, setPendingSubmitData] = useState<PartFormData | null>(null);

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
            // Clean data: convert empty strings to null, but KEEP all fields
            // API needs to receive all fields to properly update nested relations
            const cleanData: Record<string, unknown> = {};
            Object.entries(data).forEach(([key, value]) => {
                // Convert empty strings to null, but keep the field
                if (value === '') {
                    cleanData[key] = null;
                } else {
                    cleanData[key] = value;
                }
            });

            console.log('=== SUBMITTING FORM DATA ===');
            console.log(JSON.stringify(cleanData, null, 2));

            const url = isEditing ? `/api/parts/${part.id}` : '/api/parts';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanData),
            });

            const result = await response.json();

            if (!response.ok) {
                // Handle Validation Errors from Server
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
        onSuccess: (data) => {
            onSuccess?.(data);
            onOpenChange(false);
        },
        successMessage: isEditing ? 'Cập nhật part thành công!' : 'Tạo part thành công!',
    });

    // Handle submit with impact checking for edits
    const handleSubmitWithImpactCheck = async (data: PartFormData) => {
        // For new parts, just save directly
        if (!isEditing || !part?.id || !originalValuesRef.current) {
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
        await changeImpact.checkImpact('part', part.id, changes);
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
                    leadTimeDays: planning?.leadTimeDays ?? part.leadTimeDays ?? 14,
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
            } else {
                form.reset(defaultPartValues);
                originalValuesRef.current = null;
            }
            // Reset change impact state
            changeImpact.reset();
            setPendingSubmitData(null);
        }
    // Note: Only depend on changeImpact.reset (stable callback), not the whole object
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, part, form]);

    return (
        <>
        <FormModal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={isEditing ? 'Chỉnh sửa Part' : 'Thêm Part mới'}
            description={isEditing ? 'Cập nhật thông tin part' : 'Điền thông tin để tạo part mới'}
            isSubmitting={isSubmitting || changeImpact.loading}
            onSubmit={form.handleSubmit(handleSubmitWithImpactCheck)}
            maxWidth="4xl"
        >
            <Form {...form}>
                <form className="space-y-4">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid grid-cols-5 w-full dark:bg-slate-800">
                            <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                            <TabsTrigger value="physical">Vật lý</TabsTrigger>
                            <TabsTrigger value="engineering">Engineering</TabsTrigger>
                            <TabsTrigger value="procurement">Procurement</TabsTrigger>
                            <TabsTrigger value="compliance">Compliance</TabsTrigger>
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
                                                <Input type="number" min={0} step={0.01} {...field} />
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
                                            <FormLabel>Rộng (mm)</FormLabel>
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
                                            <FormLabel>Cao (mm)</FormLabel>
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
                                        <FormLabel>Màu sắc</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Black, White, Silver..." {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                                <Input type="number" min={0} {...field} />
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
                                            <FormLabel>SL đặt tối thiểu</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={1} {...field} />
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
                                            <FormLabel>Tồn kho tối thiểu</FormLabel>
                                            <FormControl>
                                                <Input type="number" min={0} {...field} />
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
                                                <Input type="number" min={0} {...field} />
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
                                            <FormLabel>Tồn kho tối đa</FormLabel>
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
