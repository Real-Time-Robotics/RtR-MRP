'use client';

// =============================================================================
// PO COMPARISON - Side-by-side supplier comparison
// Shows price, lead time, score, and AI recommendation
// =============================================================================

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Building2,
  Star,
  Clock,
  DollarSign,
  Award,
  TrendingUp,
  TrendingDown,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SupplierOption {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  leadTimeDays: number;
  score: number;
  isRecommended?: boolean;
  isCurrentSupplier?: boolean;
  priceComparison?: 'lowest' | 'average' | 'highest';
  notes?: string;
  pros?: string[];
  cons?: string[];
}

interface POComparisonProps {
  partNumber: string;
  partName: string;
  quantity: number;
  suppliers: SupplierOption[];
  onSelectSupplier?: (supplierId: string) => void;
  selectedSupplierId?: string;
  className?: string;
}

export function POComparison({
  partNumber,
  partName,
  quantity,
  suppliers,
  onSelectSupplier,
  selectedSupplierId,
  className,
}: POComparisonProps) {
  // Find lowest price for comparison
  const lowestPrice = Math.min(...suppliers.map((s) => s.unitPrice));
  const highestScore = Math.max(...suppliers.map((s) => s.score));
  const shortestLead = Math.min(...suppliers.map((s) => s.leadTimeDays));

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          So sánh nhà cung cấp
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {partNumber} - {partName} | Số lượng: {quantity.toLocaleString()}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {suppliers.map((supplier) => {
            const totalPrice = supplier.unitPrice * quantity;
            const isSelected = selectedSupplierId === supplier.supplierId;
            const savingsVsHighest = Math.max(...suppliers.map(s => s.unitPrice)) - supplier.unitPrice;
            const savingsPercent = savingsVsHighest > 0
              ? ((savingsVsHighest / Math.max(...suppliers.map(s => s.unitPrice))) * 100).toFixed(1)
              : 0;

            return (
              <div
                key={supplier.supplierId}
                className={cn(
                  'relative border rounded-lg p-4 transition-all cursor-pointer hover:border-primary/50',
                  supplier.isRecommended && 'border-green-500 bg-green-50/50 dark:bg-green-950/20',
                  isSelected && 'ring-2 ring-primary'
                )}
                onClick={() => onSelectSupplier?.(supplier.supplierId)}
              >
                {/* Recommended badge */}
                {supplier.isRecommended && (
                  <Badge className="absolute -top-2 -right-2 bg-green-600">
                    <Award className="h-3 w-3 mr-1" />
                    Đề xuất
                  </Badge>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{supplier.supplierName}</span>
                    {supplier.isCurrentSupplier && (
                      <Badge variant="outline" className="text-xs">
                        NCC hiện tại
                      </Badge>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Price */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <DollarSign className="h-3 w-3" />
                      Đơn giá
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        'font-semibold',
                        supplier.unitPrice === lowestPrice && 'text-green-600'
                      )}>
                        {formatCurrency(supplier.unitPrice)}
                      </span>
                      {supplier.unitPrice === lowestPrice && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <TrendingDown className="h-3 w-3 text-green-600" />
                            </TooltipTrigger>
                            <TooltipContent>Giá thấp nhất</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tổng: {formatCurrency(totalPrice)}
                    </p>
                  </div>

                  {/* Lead time */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                      Thời gian giao
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        'font-semibold',
                        supplier.leadTimeDays === shortestLead && 'text-green-600'
                      )}>
                        {supplier.leadTimeDays} ngày
                      </span>
                      {supplier.leadTimeDays === shortestLead && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            </TooltipTrigger>
                            <TooltipContent>Nhanh nhất</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Star className="h-3 w-3" />
                      Đánh giá
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        'font-semibold',
                        supplier.score === highestScore && 'text-green-600'
                      )}>
                        {supplier.score.toFixed(1)}/5
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'h-3 w-3',
                              star <= supplier.score
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings indicator */}
                {Number(savingsPercent) > 0 && (
                  <div className="mt-2 text-xs text-green-600">
                    Tiết kiệm {savingsPercent}% so với giá cao nhất
                  </div>
                )}

                {/* Pros/Cons */}
                {(supplier.pros || supplier.cons) && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
                    {supplier.pros && supplier.pros.length > 0 && (
                      <div>
                        <p className="font-medium text-green-600 mb-1">Ưu điểm</p>
                        <ul className="space-y-0.5">
                          {supplier.pros.slice(0, 2).map((pro, i) => (
                            <li key={i} className="flex items-start gap-1 text-muted-foreground">
                              <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {supplier.cons && supplier.cons.length > 0 && (
                      <div>
                        <p className="font-medium text-yellow-600 mb-1">Lưu ý</p>
                        <ul className="space-y-0.5">
                          {supplier.cons.slice(0, 2).map((con, i) => (
                            <li key={i} className="flex items-start gap-1 text-muted-foreground">
                              <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {supplier.notes && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    {supplier.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default POComparison;
