'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ActivityFiltersProps {
  entityType: string;
  onEntityTypeChange: (value: string) => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
}

export function ActivityFilters({
  entityType,
  onEntityTypeChange,
  dateRange,
  onDateRangeChange,
}: ActivityFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select value={entityType} onValueChange={onEntityTypeChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Loai entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tat ca</SelectItem>
          <SelectItem value="PO">Purchase Order</SelectItem>
          <SelectItem value="SO">Sales Order</SelectItem>
          <SelectItem value="WORK_ORDER">Work Order</SelectItem>
          <SelectItem value="MRP_RUN">MRP Run</SelectItem>
        </SelectContent>
      </Select>

      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Thoi gian" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hom nay</SelectItem>
          <SelectItem value="3days">3 ngay</SelectItem>
          <SelectItem value="7days">7 ngay</SelectItem>
          <SelectItem value="30days">30 ngay</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
