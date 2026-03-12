'use client';

// =============================================================================
// APPROVAL QUEUE - List container for PO suggestions with bulk actions
// Includes bulk select, filters, sort options, and empty state
// =============================================================================

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  ArrowUpDown,
  Check,
  X,
  Inbox,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { SuggestionCard, POSuggestion } from './suggestion-card';
import { formatCurrency } from '@/lib/utils';

type SortField = 'priority' | 'confidence' | 'value' | 'date';
type SortOrder = 'asc' | 'desc';

interface ApprovalQueueProps {
  suggestions: POSuggestion[];
  loading?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onBulkApprove?: (ids: string[]) => void;
  onBulkReject?: (ids: string[]) => void;
  onViewDetails?: (id: string) => void;
  onModify?: (id: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export function ApprovalQueue({
  suggestions,
  loading = false,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  onViewDetails,
  onModify,
  onRefresh,
  className,
}: ApprovalQueueProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');

  // Filter and sort suggestions
  const filteredSuggestions = useMemo(() => {
    let result = [...suggestions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.partNumber.toLowerCase().includes(query) ||
          s.partName.toLowerCase().includes(query) ||
          s.supplierName.toLowerCase().includes(query)
      );
    }

    // Confidence filter
    if (filterConfidence !== 'all') {
      result = result.filter((s) => {
        const conf = s.confidence;
        switch (filterConfidence) {
          case 'high':
            return conf >= 0.8;
          case 'medium':
            return conf >= 0.6 && conf < 0.8;
          case 'low':
            return conf < 0.6;
          default:
            return true;
        }
      });
    }

    // Urgency filter
    if (filterUrgency !== 'all') {
      result = result.filter((s) => s.urgency === filterUrgency);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.urgency] - priorityOrder[b.urgency];
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'value':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [suggestions, searchQuery, sortField, sortOrder, filterConfidence, filterUrgency]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredSuggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSuggestions.map((s) => s.id)));
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = () => {
    if (onBulkApprove && selectedIds.size > 0) {
      onBulkApprove(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkReject = () => {
    if (onBulkReject && selectedIds.size > 0) {
      onBulkReject(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  // Calculate summary
  const summary = useMemo(() => {
    const selectedSuggestions = filteredSuggestions.filter((s) => selectedIds.has(s.id));
    return {
      total: filteredSuggestions.length,
      selected: selectedIds.size,
      totalValue: filteredSuggestions.reduce((sum, s) => sum + s.totalAmount, 0),
      selectedValue: selectedSuggestions.reduce((sum, s) => sum + s.totalAmount, 0),
    };
  }, [filteredSuggestions, selectedIds]);

  const isAllSelected = selectedIds.size === filteredSuggestions.length && filteredSuggestions.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Compact single-row header + filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <h3 className="text-sm font-semibold whitespace-nowrap">
          Hàng đợi phê duyệt
          <Badge variant="secondary" className="ml-1.5 text-[10px]">
            {summary.total}
          </Badge>
        </h3>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Tổng: <span className="font-medium">{formatCurrency(summary.totalValue)}</span>
        </span>

        <div className="flex-1" />

        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Select value={filterConfidence} onValueChange={setFilterConfidence}>
          <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs gap-1 px-2.5">
            <SelectValue placeholder="Độ tin cậy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="high">Cao (≥80%)</SelectItem>
            <SelectItem value="medium">Trung bình</SelectItem>
            <SelectItem value="low">Thấp (&lt;60%)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterUrgency} onValueChange={setFilterUrgency}>
          <SelectTrigger className="h-8 w-auto min-w-[90px] text-xs gap-1 px-2.5">
            <SelectValue placeholder="Mức độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="critical">Khẩn cấp</SelectItem>
            <SelectItem value="high">Cao</SelectItem>
            <SelectItem value="medium">Trung bình</SelectItem>
            <SelectItem value="low">Thấp</SelectItem>
          </SelectContent>
        </Select>

        <Select value={`${sortField}-${sortOrder}`} onValueChange={(v) => {
          const [field, order] = v.split('-') as [SortField, SortOrder];
          setSortField(field);
          setSortOrder(order);
        }}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority-desc">Ưu tiên cao trước</SelectItem>
            <SelectItem value="priority-asc">Ưu tiên thấp trước</SelectItem>
            <SelectItem value="confidence-desc">Tin cậy cao trước</SelectItem>
            <SelectItem value="confidence-asc">Tin cậy thấp trước</SelectItem>
            <SelectItem value="value-desc">Giá trị cao trước</SelectItem>
            <SelectItem value="value-asc">Giá trị thấp trước</SelectItem>
            <SelectItem value="date-desc">Mới nhất trước</SelectItem>
            <SelectItem value="date-asc">Cũ nhất trước</SelectItem>
          </SelectContent>
        </Select>

        {onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="h-8 w-8">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4 mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Đã chọn <span className="font-medium">{summary.selected}</span> mục
              ({formatCurrency(summary.selectedValue)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkReject}
              className="text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Từ chối ({summary.selected})
            </Button>
            <Button
              size="sm"
              onClick={handleBulkApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Phê duyệt ({summary.selected})
            </Button>
          </div>
        </div>
      )}

      {/* Select all checkbox (when nothing selected) */}
      {selectedIds.size === 0 && filteredSuggestions.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">Chọn tất cả</span>
        </div>
      )}

      {/* Suggestions list */}
      {filteredSuggestions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              selected={selectedIds.has(suggestion.id)}
              onSelect={handleSelect}
              onApprove={onApprove}
              onReject={onReject}
              onViewDetails={onViewDetails}
              onModify={onModify}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          searching={!!searchQuery || filterConfidence !== 'all' || filterUrgency !== 'all'}
          onClearFilters={() => {
            setSearchQuery('');
            setFilterConfidence('all');
            setFilterUrgency('all');
          }}
        />
      )}
    </div>
  );
}

function EmptyState({
  searching,
  onClearFilters,
}: {
  searching: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">
        {searching ? 'Không tìm thấy kết quả' : 'Hàng đợi trống'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {searching
          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
          : 'Hiện tại không có đề xuất PO nào đang chờ phê duyệt. Hệ thống sẽ tự động tạo đề xuất khi phát hiện nhu cầu đặt hàng.'}
      </p>
      {searching && (
        <Button variant="outline" onClick={onClearFilters}>
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}

export default ApprovalQueue;
