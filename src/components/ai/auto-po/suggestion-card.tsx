'use client';

// =============================================================================
// SUGGESTION CARD - Card component for displaying PO suggestion
// Includes part info, supplier, quantity, price, confidence, actions
// =============================================================================

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Building2,
  Calendar,
  AlertTriangle,
  Check,
  X,
  MoreVertical,
  ExternalLink,
  Edit,
  Clock,
  Star,
  TrendingUp,
} from 'lucide-react';
import { ConfidenceIndicator } from './confidence-indicator';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface POSuggestion {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  partCategory?: string;
  supplierId: string;
  supplierName: string;
  supplierScore?: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  confidence: number;
  reason: string;
  aiNotes?: string;
  expectedDeliveryDate?: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  risks?: string[];
  createdAt: string;
  status?: 'pending' | 'approved' | 'rejected' | 'executed';
}

interface SuggestionCardProps {
  suggestion: POSuggestion;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onModify?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function SuggestionCard({
  suggestion,
  selected = false,
  onSelect,
  onApprove,
  onReject,
  onViewDetails,
  onModify,
  showActions = true,
  compact = false,
  className,
}: SuggestionCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const urgencyColors = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300',
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300',
  };

  const urgencyLabels = {
    critical: 'Khẩn cấp',
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  };

  const statusColors = {
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    executed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  const statusLabels = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    executed: 'Đã thực hiện',
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        selected && 'ring-2 ring-primary',
        isHovered && 'shadow-md',
        suggestion.urgency === 'critical' && 'border-l-4 border-l-red-500',
        suggestion.urgency === 'high' && 'border-l-4 border-l-orange-500',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className={cn('pb-2', compact && 'py-2')}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {onSelect && (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelect(suggestion.id, checked as boolean)}
                className="mt-1"
              />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{suggestion.partNumber}</span>
                {suggestion.partCategory && (
                  <Badge variant="outline" className="text-xs">
                    {suggestion.partCategory}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {suggestion.partName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs', urgencyColors[suggestion.urgency])}>
              {urgencyLabels[suggestion.urgency]}
            </Badge>
            {suggestion.status && (
              <Badge className={cn('text-xs', statusColors[suggestion.status])}>
                {statusLabels[suggestion.status]}
              </Badge>
            )}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(suggestion.id)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Xem chi tiết
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onModify?.(suggestion.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onApprove?.(suggestion.id)}
                    className="text-green-600"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Phê duyệt
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onReject?.(suggestion.id)}
                    className="text-red-600"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Từ chối
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-3', compact && 'py-2')}>
        {/* Supplier Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{suggestion.supplierName}</span>
            {suggestion.supplierScore && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-muted-foreground">
                        {suggestion.supplierScore.toFixed(1)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Đánh giá nhà cung cấp: {suggestion.supplierScore}/5
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <ConfidenceIndicator score={suggestion.confidence} size="sm" />
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-3 gap-4 bg-muted/50 rounded-lg p-3">
          <div>
            <p className="text-xs text-muted-foreground">Số lượng</p>
            <p className="font-semibold">{suggestion.quantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Đơn giá</p>
            <p className="font-semibold">{formatCurrency(suggestion.unitPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tổng tiền</p>
            <p className="font-semibold text-primary">{formatCurrency(suggestion.totalAmount)}</p>
          </div>
        </div>

        {/* Expected Delivery */}
        {suggestion.expectedDeliveryDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Dự kiến giao:</span>
            <span className="font-medium">{formatDate(suggestion.expectedDeliveryDate)}</span>
          </div>
        )}

        {/* AI Reasoning Summary */}
        {suggestion.aiNotes && !compact && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-2 text-sm">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-muted-foreground line-clamp-2">{suggestion.aiNotes}</p>
            </div>
          </div>
        )}

        {/* Risk Badges */}
        {suggestion.risks && suggestion.risks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestion.risks.slice(0, 3).map((risk, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {risk}
              </Badge>
            ))}
            {suggestion.risks.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{suggestion.risks.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      {showActions && suggestion.status === 'pending' && (
        <CardFooter className={cn('pt-0 gap-2', compact && 'py-2')}>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onReject?.(suggestion.id)}
          >
            <X className="h-4 w-4 mr-1" />
            Từ chối
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => onApprove?.(suggestion.id)}
          >
            <Check className="h-4 w-4 mr-1" />
            Phê duyệt
          </Button>
        </CardFooter>
      )}

      {/* Created time */}
      <div className="px-4 pb-2 text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDate(suggestion.createdAt, true)}
      </div>
    </Card>
  );
}

export default SuggestionCard;
