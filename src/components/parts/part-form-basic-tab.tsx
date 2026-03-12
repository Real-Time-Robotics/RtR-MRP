'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
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
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import {
    PartFormData,
    CATEGORIES,
    CATEGORY_LABELS,
    UNITS,
} from './part-form-schema';
import type { TabSectionProps } from './part-form-types';

export type PartFormBasicTabProps = TabSectionProps;

export function PartFormBasicTab({
    isEditing,
    isSubmitting,
    isTabDirty,
    onResetTab,
}: PartFormBasicTabProps): React.ReactElement {
    const form = useFormContext<PartFormData>();

    return (
        <div className="space-y-4 mt-4">
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
                    onClick={onResetTab}
                    disabled={!isTabDirty || isSubmitting}
                >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset Tab
                </Button>
            </div>
        </div>
    );
}
