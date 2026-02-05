'use client';

import { cn } from '@/lib/utils';
import { CostingBreakdown, getMarginStatus } from './types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CostingTableProps {
  costings: CostingBreakdown[];
  className?: string;
  onRowClick?: (costing: CostingBreakdown) => void;
  selectedId?: string;
}

const formatCurrency = (value: number, currency: string = 'VND') => {
  if (currency === 'VND') {
    if (value >= 1000000) {
      return `₫${(value / 1000000).toFixed(2)}M`;
    }
    return `₫${value.toLocaleString()}`;
  }
  return value.toFixed(2);
};

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

export function CostingTable({ costings, className, onRowClick, selectedId }: CostingTableProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden',
        className
      )}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800">
              <TableHead className="font-semibold">SKU/Part</TableHead>
              <TableHead className="text-right font-semibold">Unit Cost</TableHead>
              <TableHead className="text-right text-xs">Freight</TableHead>
              <TableHead className="text-right text-xs">Tax</TableHead>
              <TableHead className="text-right text-xs">Import</TableHead>
              <TableHead className="text-right font-semibold">Landed</TableHead>
              <TableHead className="text-right font-semibold">Landed VND</TableHead>
              <TableHead className="text-right font-semibold">SRP</TableHead>
              <TableHead className="text-right font-semibold">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costings.map((costing) => {
              const marginStatus = getMarginStatus(costing.grossMargin);
              const isSelected = selectedId === costing.id;

              return (
                <TableRow
                  key={costing.id}
                  className={cn(
                    'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    onRowClick && 'cursor-pointer',
                    isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => onRowClick?.(costing)}
                >
                  <TableCell className="font-mono text-sm">
                    {costing.partId || costing.skuId}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <span className="text-xs text-slate-400 mr-1">{costing.unitCostCurrency}</span>
                    {costing.unitCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-500">
                    +{costing.freightInsuranceValue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-500">
                    +{costing.othersTaxValue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-500">
                    +{costing.importTaxValue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {costing.landedCost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(costing.landedCostVND)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                    {formatCurrency(costing.srp)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        marginStatus.bgColor,
                        marginStatus.color
                      )}
                    >
                      {formatPercentage(costing.grossMargin)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default CostingTable;
