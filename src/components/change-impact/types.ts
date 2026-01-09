/**
 * Change Impact Dialog - Component Types
 */

import { ChangeImpactResult, ImpactedItem, FieldChange } from '@/lib/change-impact/types';

export interface ChangeImpactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ChangeImpactResult | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ChangeImpactTableProps {
  items: ImpactedItem[];
  onNavigate?: (item: ImpactedItem) => void;
}

export interface FieldChangeDisplayProps {
  changes: FieldChange[];
}

export interface UseChangeImpactOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface UseChangeImpactReturn {
  checkImpact: (
    entity: string,
    entityId: string,
    changes: FieldChange[]
  ) => Promise<ChangeImpactResult | null>;
  result: ChangeImpactResult | null;
  loading: boolean;
  error: string | null;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  confirm: () => void;
  cancel: () => void;
  reset: () => void;
}
