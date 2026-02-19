// src/components/parts/part-form-dialog/types.ts
// Shared types for PartFormDialog components

import { Part } from '@/components/forms/part-form';
import { ComboboxOption } from '@/components/ui/combobox';
import { PartFormData } from '../part-form-schema';
import { SupplierRecord } from '../part-form-types';

export interface PartFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    part?: Part | null;
    onSuccess?: (part: Part) => void;
}

export interface PartFormDialogTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    dirtyTabs: string[];
    isEditing: boolean;
    isSubmitting: boolean;
    isTabDirty: (tabName: string) => boolean;
    onResetTab: (tabName: string) => void;
    suppliers: SupplierRecord[];
    manufacturers: ComboboxOption[];
    onOpenSupplierDialog: () => void;
    onOpenSupplierPicker: (matches: SupplierRecord[]) => void;
    savedPartId: string | null;
    formMode: 'create' | 'edit';
    part?: Part | null;
    changeImpactLoading: boolean;
}

export interface PartFormDialogFooterProps {
    isEditing: boolean;
    isSubmitting: boolean;
    isFormComplete: boolean;
    isCurrentTabComplete: boolean;
    isLastTab: boolean;
    canSaveDraft: boolean;
    changeImpactLoading: boolean;
    nextTabName: string | null;
    onClose: () => void;
    onDraftSave: () => void;
    onSave: () => void;
    onNextTab: () => void;
}
