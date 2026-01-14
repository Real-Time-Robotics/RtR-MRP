// =============================================================================
// INDUSTRIAL PRECISION TABLE
// Excel-like styling with row numbers, grid lines, sticky headers
// =============================================================================

import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto border border-mrp-border dark:border-mrp-border">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom text-sm font-mono",
        "border-collapse",
        className
      )}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      // Industrial Precision: Sticky header with steel background
      "sticky top-0 z-10",
      "bg-gray-100 dark:bg-steel-dark",
      "[&_tr]:border-b [&_tr]:border-mrp-border",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "bg-white dark:bg-gunmetal",
      "[&_tr:last-child]:border-0",
      className
    )}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-mrp-border bg-gray-50 dark:bg-steel-dark font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      // Industrial Precision: Grid lines, subtle hover
      "border-b border-mrp-border/50 dark:border-mrp-border/30",
      "transition-colors",
      "hover:bg-gray-50 dark:hover:bg-gunmetal-light",
      "data-[state=selected]:bg-info-cyan/10 dark:data-[state=selected]:bg-info-cyan/10",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      // Industrial Precision: Excel-like header
      "h-9 px-3 py-2",
      "text-left align-middle",
      "text-xs font-semibold uppercase tracking-wider",
      "text-gray-600 dark:text-mrp-text-secondary",
      "border-r border-mrp-border/30 last:border-r-0",
      "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      // Industrial Precision: Excel-like cell with grid
      "px-3 py-2.5",
      "align-middle",
      "text-sm font-mono tabular-nums",
      "text-gray-900 dark:text-mrp-text-primary",
      "border-r border-mrp-border/20 last:border-r-0",
      "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-4 text-xs text-mrp-text-muted font-mono",
      className
    )}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// =============================================================================
// ROW NUMBER CELL - Excel-like row numbering
// =============================================================================

interface TableRowNumberProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  rowNumber: number;
}

const TableRowNumber = React.forwardRef<
  HTMLTableCellElement,
  TableRowNumberProps
>(({ className, rowNumber, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      // Industrial Precision: Excel row number style
      "w-10 px-2 py-2.5",
      "text-center align-middle",
      "text-xs font-mono tabular-nums",
      "text-mrp-text-muted",
      "bg-gray-50 dark:bg-steel-dark",
      "border-r border-mrp-border",
      "select-none",
      className
    )}
    {...props}
  >
    {rowNumber}
  </td>
))
TableRowNumber.displayName = "TableRowNumber"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableRowNumber,
}
