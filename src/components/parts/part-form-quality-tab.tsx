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
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { PartFormData } from './part-form-schema';
import type { TabSectionProps } from './part-form-types';

export type PartFormQualityTabProps = TabSectionProps;

export function PartFormQualityTab({
    isSubmitting,
    isTabDirty,
    onResetTab,
}: PartFormQualityTabProps): React.ReactElement {
    const form = useFormContext<PartFormData>();

    return (
        <div className="space-y-4 mt-4">
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
