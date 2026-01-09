/**
 * Change Impact Components - Barrel Export
 */

// Components
export { ChangeImpactDialog } from './change-impact-dialog';
export { ChangeImpactTable } from './change-impact-table';

// Hooks
export {
  useChangeImpact,
  detectChanges,
  PART_FORM_FIELD_CONFIG,
  BOM_FORM_FIELD_CONFIG,
} from './hooks/use-change-impact';

// Types
export type {
  ChangeImpactDialogProps,
  ChangeImpactTableProps,
  FieldChangeDisplayProps,
  UseChangeImpactOptions,
  UseChangeImpactReturn,
} from './types';
