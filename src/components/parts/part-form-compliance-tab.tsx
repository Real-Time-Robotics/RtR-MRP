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
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { PartFormData, COUNTRIES } from './part-form-schema';
import type { TabSectionProps } from './part-form-types';

export type PartFormComplianceTabProps = TabSectionProps;

export function PartFormComplianceTab({
    isSubmitting,
    isTabDirty,
    onResetTab,
}: PartFormComplianceTabProps): React.ReactElement {
    const form = useFormContext<PartFormData>();

    return (
        <div className="space-y-4 mt-4">
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
