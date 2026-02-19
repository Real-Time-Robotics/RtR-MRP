'use client';

// src/components/parts/part-form-dialog/part-form-dialog-tabs.tsx
// Tab content sections for PartFormDialog

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { PartFormBasicTab } from '../part-form-basic-tab';
import { PartFormPhysicalTab } from '../part-form-physical-tab';
import { PartFormEngineeringTab } from '../part-form-engineering-tab';
import { PartFormProcurementTab } from '../part-form-procurement-tab';
import { PartFormQualityTab } from '../part-form-quality-tab';
import { PartFormComplianceTab } from '../part-form-compliance-tab';
import type { PartFormDialogTabsProps } from './types';

export function PartFormDialogTabs({
    activeTab,
    onTabChange,
    dirtyTabs,
    isEditing,
    isSubmitting,
    isTabDirty,
    onResetTab,
    suppliers,
    manufacturers,
    onOpenSupplierDialog,
    onOpenSupplierPicker,
    savedPartId,
    formMode,
    part,
    changeImpactLoading,
}: PartFormDialogTabsProps) {
    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
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

            <TabsContent value="basic">
                <PartFormBasicTab
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    isTabDirty={isTabDirty('basic')}
                    onResetTab={() => onResetTab('basic')}
                />
            </TabsContent>

            <TabsContent value="physical">
                <PartFormPhysicalTab
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    isTabDirty={isTabDirty('physical')}
                    onResetTab={() => onResetTab('physical')}
                />
            </TabsContent>

            <TabsContent value="engineering">
                <PartFormEngineeringTab
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    isTabDirty={isTabDirty('engineering')}
                    onResetTab={() => onResetTab('engineering')}
                    manufacturers={manufacturers}
                />
            </TabsContent>

            <TabsContent value="procurement">
                <PartFormProcurementTab
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    isTabDirty={isTabDirty('procurement')}
                    onResetTab={() => onResetTab('procurement')}
                    suppliers={suppliers}
                    onOpenSupplierDialog={onOpenSupplierDialog}
                    onOpenSupplierPicker={onOpenSupplierPicker}
                />
            </TabsContent>

            <TabsContent value="quality">
                <PartFormQualityTab
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    isTabDirty={isTabDirty('quality')}
                    onResetTab={() => onResetTab('quality')}
                />
            </TabsContent>

            <TabsContent value="compliance">
                <PartFormComplianceTab
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    isTabDirty={isTabDirty('compliance')}
                    onResetTab={() => onResetTab('compliance')}
                />
            </TabsContent>
        </Tabs>
    );
}
