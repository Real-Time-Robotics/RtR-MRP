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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw, Plus } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Select as MultiSelect } from '@/components/ui-v2/select';
import { toast } from 'sonner';
import { PartFormData } from './part-form-schema';
import type { TabSectionProps, SupplierRecord } from './part-form-types';

export interface PartFormProcurementTabProps extends TabSectionProps {
    suppliers: SupplierRecord[];
    onOpenSupplierDialog: () => void;
    onOpenSupplierPicker: (matches: SupplierRecord[]) => void;
}

export function PartFormProcurementTab({
    isSubmitting,
    isTabDirty,
    onResetTab,
    suppliers,
    onOpenSupplierDialog,
    onOpenSupplierPicker,
}: PartFormProcurementTabProps): React.ReactElement {
    const form = useFormContext<PartFormData>();

    return (
        <div className="space-y-4 mt-4">
            {/* Same as manufacturer toggle */}
            {form.watch('manufacturer') && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <Switch
                        id="sameAsManufacturer"
                        checked={(() => {
                            const mfr = form.watch('manufacturer');
                            const supId = form.watch('primarySupplierId');
                            if (!mfr || !supId) return false;
                            const sup = suppliers.find(s => s.id === supId);
                            return sup ? sup.name.toLowerCase() === mfr.toLowerCase() : false;
                        })()}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                const mfrName = form.watch('manufacturer');
                                if (mfrName) {
                                    const matches = suppliers.filter(s =>
                                        s.name.toLowerCase() === mfrName.toLowerCase()
                                    );
                                    if (matches.length === 1) {
                                        form.setValue('primarySupplierId', matches[0].id);
                                        toast.success(`Đã chọn NCC "${matches[0].code} - ${matches[0].name}"`);
                                    } else if (matches.length > 1) {
                                        onOpenSupplierPicker(matches);
                                    } else {
                                        toast.error(`Không tìm thấy NCC trùng tên "${mfrName}". Hãy tạo mới.`);
                                    }
                                }
                            } else {
                                form.setValue('primarySupplierId', null);
                            }
                        }}
                    />
                    <label htmlFor="sameAsManufacturer" className="text-sm cursor-pointer">
                        Nhà cung cấp cùng nhà sản xuất <span className="font-medium">({form.watch('manufacturer')})</span>
                    </label>
                </div>
            )}

            <FormField
                control={form.control}
                name="primarySupplierId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nhà cung cấp chính *</FormLabel>
                        <div className="flex gap-2">
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
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={onOpenSupplierDialog}
                                title="Tạo nhà cung cấp mới"
                                aria-label="Tạo nhà cung cấp mới"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="secondarySupplierIds"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nhà cung cấp phụ</FormLabel>
                        <FormControl>
                            <MultiSelect
                                options={suppliers
                                    .filter((s) => s.id !== form.watch('primarySupplierId'))
                                    .map((s) => ({
                                        value: s.id,
                                        label: `${s.code} - ${s.name}`,
                                    }))}
                                value={field.value || []}
                                onChange={(val) => field.onChange(val)}
                                placeholder="Chọn nhà cung cấp phụ..."
                                multiple
                                searchable
                                searchPlaceholder="Tìm nhà cung cấp..."
                                noOptionsMessage="Không tìm thấy nhà cung cấp"
                                clearable
                            />
                        </FormControl>
                        <FormDescription>
                            Có thể chọn nhiều nhà cung cấp phụ để dự phòng
                        </FormDescription>
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
