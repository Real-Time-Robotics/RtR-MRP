'use client';

// src/components/parts/part-form-dialog/part-form-dialog-footer.tsx
// Footer with action buttons for PartFormDialog

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, FilePenLine, ChevronRight } from 'lucide-react';
import type { PartFormDialogFooterProps } from './types';

export function PartFormDialogFooter({
    isEditing,
    isSubmitting,
    isFormComplete,
    isCurrentTabComplete,
    isLastTab,
    canSaveDraft,
    changeImpactLoading,
    nextTabName,
    onClose,
    onDraftSave,
    onSave,
    onNextTab,
}: PartFormDialogFooterProps) {
    return (
        <div className="flex justify-between w-full">
            <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || changeImpactLoading}
            >
                Hủy
            </Button>
            <div className="flex gap-2">
                {/* Show "Lưu nháp" when form is not complete and partNumber exists */}
                {!isFormComplete && canSaveDraft && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onDraftSave}
                        disabled={isSubmitting || changeImpactLoading}
                    >
                        {(isSubmitting || changeImpactLoading) && (
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
                        onClick={onSave}
                        disabled={isSubmitting || changeImpactLoading}
                    >
                        {(isSubmitting || changeImpactLoading) ? (
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
                        onClick={onNextTab}
                        disabled={isSubmitting || changeImpactLoading}
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
    );
}
