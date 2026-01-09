// =============================================================================
// EXCEL-LIKE UI SYSTEM - TYPE DEFINITIONS
// =============================================================================

export interface ExcelModeConfig {
  enabled: boolean;
  showRowNumbers?: boolean;      // default: true
  columnHeaderStyle?: 'alpha' | 'field-names' | 'combined'; // default: 'field-names'
  gridBorders?: boolean;         // default: true
  showFooter?: boolean;          // default: true
  sheetName?: string;            // default: 'Sheet1'
  compactMode?: boolean;         // default: false
}

export interface ExcelColumnConfig {
  showAlphaPrefix?: boolean;     // Show A, B, C prefix
  customHeader?: string;         // Override header text
}

export interface ExcelSelectionState {
  selectedRows: Set<string>;
  selectedCells: Array<{ rowId: string; colKey: string }>;
  activeCell?: { rowId: string; colKey: string };
  selectionRange?: {
    start: { row: number; col: number };
    end: { row: number; col: number };
  };
}

export interface ExcelRowNumberProps {
  index: number;
  isSelected?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export interface ExcelHeaderCellProps {
  columnIndex: number;
  columnKey: string;
  headerText: string;
  style: 'alpha' | 'field-names' | 'combined';
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

// Default configuration
export const DEFAULT_EXCEL_CONFIG: Required<ExcelModeConfig> = {
  enabled: true,
  showRowNumbers: true,
  columnHeaderStyle: 'field-names',
  gridBorders: true,
  showFooter: true,
  sheetName: 'Sheet1',
  compactMode: false,
};

// Helper to merge configs
export function mergeExcelConfig(config?: ExcelModeConfig): Required<ExcelModeConfig> | null {
  if (!config?.enabled) return null;
  return { ...DEFAULT_EXCEL_CONFIG, ...config };
}
