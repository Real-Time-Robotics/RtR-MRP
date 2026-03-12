'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { PartFormData } from './part-form-schema';
import type { TabSectionProps } from './part-form-types';

export type PartFormPhysicalTabProps = TabSectionProps;

export function PartFormPhysicalTab({
    isSubmitting,
    isTabDirty,
    onResetTab,
}: PartFormPhysicalTabProps): React.ReactElement {
    const form = useFormContext<PartFormData>();

    return (
        <div className="space-y-4 mt-4">
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
