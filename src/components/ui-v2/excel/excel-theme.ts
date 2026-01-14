// =============================================================================
// EXCEL-LIKE UI SYSTEM - THEME & COLORS
// Microsoft Excel inspired color palette
// =============================================================================

export const excelColors = {
  // Primary Excel Green
  primary: '#217346',
  primaryHover: '#1e6b3f',
  primaryDark: '#1a5c36',

  // Light backgrounds
  primaryLight: '#E2EFDA',       // Light green for selection/hover
  primaryLighter: '#F5FAF5',     // Very light green
  primaryLightest: '#FAFCFA',    // Almost white green tint

  // UI Elements
  headerBg: '#F0F0F0',           // Header background (light mode)
  rowNumberBg: '#F8F9FA',        // Row number column background
  cellBg: '#FFFFFF',             // Cell background
  border: '#D6D6D6',             // Cell borders
  borderLight: '#E8E8E8',        // Lighter borders

  // Selection
  selection: 'rgba(33, 115, 70, 0.12)',
  selectionBorder: '#217346',
  selectionActive: 'rgba(33, 115, 70, 0.2)',

  // Text
  headerText: '#333333',
  cellText: '#1a1a1a',
  rowNumberText: '#666666',

  // Dark mode variants (Industrial Precision theme)
  dark: {
    primary: '#70AD47',
    primaryHover: '#5a9a3a',
    primaryLight: 'rgba(33, 115, 70, 0.2)',
    primaryLighter: 'rgba(33, 115, 70, 0.1)',
    headerBg: '#1A1D23',           // Steel dark
    rowNumberBg: '#2D3139',        // Gunmetal
    cellBg: '#1A1D23',             // Steel dark
    border: '#3D4450',             // Industrial slate
    borderLight: '#2D3139',        // Gunmetal
    selection: 'rgba(112, 173, 71, 0.2)',
    selectionBorder: '#70AD47',
    headerText: '#F4F4F5',         // Industrial text primary
    cellText: '#F4F4F5',           // Industrial text primary
    rowNumberText: '#A1A1AA',      // Industrial text secondary
  }
} as const;

// CSS class utilities (Industrial Precision dark mode)
export const excelClasses = {
  // Header bar (title bar)
  headerBar: 'bg-[#217346] dark:bg-steel-dark text-white',

  // Column header row
  columnHeader: 'bg-[#E2EFDA] dark:bg-[#217346]/20 border-b border-[#217346]/30',
  columnHeaderCell: 'px-2 py-1.5 text-[10px] font-semibold text-[#217346] dark:text-[#70AD47] border-r border-[#217346]/20 last:border-r-0',

  // Row number column
  rowNumber: 'bg-slate-50 dark:bg-gunmetal text-center text-[10px] text-slate-400 dark:text-mrp-text-secondary font-mono border-r border-slate-200 dark:border-industrial-slate',
  rowNumberActive: 'bg-[#E2EFDA] dark:bg-[#217346]/20 text-[#217346] dark:text-[#70AD47] font-semibold',

  // Data cells
  cell: 'px-2 py-1.5 text-[11px] border-r border-b border-slate-200 dark:border-industrial-slate last:border-r-0 font-mono',
  cellHover: 'hover:bg-[#E2EFDA]/50 dark:hover:bg-[#217346]/10',
  cellSelected: 'bg-[#E2EFDA]/70 dark:bg-[#217346]/20 border-l-2 border-l-[#217346] dark:border-l-[#70AD47]',
  cellActive: 'ring-2 ring-[#217346] dark:ring-[#70AD47] ring-inset bg-[#E2EFDA]/50',

  // Data rows
  row: 'border-b border-slate-200 dark:border-industrial-slate last:border-b-0 transition-colors',
  rowHover: 'hover:bg-[#E2EFDA]/30 dark:hover:bg-[#217346]/10',
  rowSelected: 'bg-[#E2EFDA]/50 dark:bg-[#217346]/15',
  rowStriped: 'even:bg-slate-50/50 dark:even:bg-gunmetal/50',

  // Footer
  footer: 'bg-slate-50 dark:bg-gunmetal border-t border-slate-200 dark:border-industrial-slate',
  footerSheetTab: 'px-3 py-1 text-[10px] font-medium text-[#217346] dark:text-[#70AD47] bg-white dark:bg-steel-dark border border-slate-200 dark:border-industrial-slate rounded-t-md',
  footerSheetTabActive: 'bg-[#E2EFDA] dark:bg-[#217346]/30 border-b-white dark:border-b-steel-dark',

  // Container
  container: 'border border-[#217346]/30 dark:border-[#70AD47]/30 rounded-md overflow-hidden',

  // Value type styling
  valueNumber: 'text-blue-600 dark:text-info-cyan text-right',
  valueBoolean: 'font-semibold',
  valueBooleanTrue: 'text-[#217346] dark:text-[#70AD47]',
  valueBooleanFalse: 'text-red-500 dark:text-urgent-red',
  valueNull: 'text-slate-400 dark:text-mrp-text-muted italic',
  valueString: 'text-slate-700 dark:text-mrp-text-primary',
} as const;

// Helper: Get column letter (A, B, C, ... AA, AB, etc.)
export function getColumnLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

// Helper: Format header based on style
export function formatColumnHeader(
  index: number,
  fieldName: string,
  style: 'alpha' | 'field-names' | 'combined'
): string {
  const letter = getColumnLetter(index);
  switch (style) {
    case 'alpha':
      return letter;
    case 'field-names':
      return fieldName;
    case 'combined':
      return `${letter} - ${fieldName}`;
    default:
      return fieldName;
  }
}

// Helper: Get cell value class based on type
export function getCellValueClass(value: unknown): string {
  if (value === null || value === undefined) {
    return excelClasses.valueNull;
  }
  if (typeof value === 'number') {
    return excelClasses.valueNumber;
  }
  if (typeof value === 'boolean') {
    return `${excelClasses.valueBoolean} ${value ? excelClasses.valueBooleanTrue : excelClasses.valueBooleanFalse}`;
  }
  return excelClasses.valueString;
}
