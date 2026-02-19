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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { PartFormData } from './part-form-schema';
import type { TabSectionProps } from './part-form-types';

export interface PartFormEngineeringTabProps extends TabSectionProps {
    manufacturers: ComboboxOption[];
}

export function PartFormEngineeringTab({
    isSubmitting,
    isTabDirty,
    onResetTab,
    manufacturers,
}: PartFormEngineeringTabProps): React.ReactElement {
    const form = useFormContext<PartFormData>();

    return (
        <div className="space-y-4 mt-4">
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
                                    searchPlaceholder="Tìm hoặc nhập tên mới..."
                                    emptyText="Không tìm thấy nhà sản xuất"
                                    allowCreate={true}
                                    createLabel="Tạo nhà sản xuất mới"
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
