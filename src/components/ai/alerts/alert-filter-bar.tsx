'use client';

import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertPriority,
  AlertSource,
  AlertStatus,
  getSourceLabel,
  getPriorityLabel,
} from '@/lib/ai/alerts';

interface AlertFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedPriorities: AlertPriority[];
  onPrioritiesChange: (priorities: AlertPriority[]) => void;
  selectedSources: AlertSource[];
  onSourcesChange: (sources: AlertSource[]) => void;
  selectedStatus: AlertStatus | 'all';
  onStatusChange: (status: AlertStatus | 'all') => void;
  onClearFilters: () => void;
}

export function AlertFilterBar({
  search,
  onSearchChange,
  selectedPriorities,
  onPrioritiesChange,
  selectedSources,
  onSourcesChange,
  selectedStatus,
  onStatusChange,
  onClearFilters,
}: AlertFilterBarProps) {
  const allPriorities = Object.values(AlertPriority);
  const allSources = Object.values(AlertSource);
  const allStatuses = ['all', ...Object.values(AlertStatus)] as const;

  const togglePriority = (priority: AlertPriority) => {
    if (selectedPriorities.includes(priority)) {
      onPrioritiesChange(selectedPriorities.filter(p => p !== priority));
    } else {
      onPrioritiesChange([...selectedPriorities, priority]);
    }
  };

  const toggleSource = (source: AlertSource) => {
    if (selectedSources.includes(source)) {
      onSourcesChange(selectedSources.filter(s => s !== source));
    } else {
      onSourcesChange([...selectedSources, source]);
    }
  };

  const hasActiveFilters =
    search ||
    selectedPriorities.length > 0 ||
    selectedSources.length > 0 ||
    selectedStatus !== 'all';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm alerts..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Select */}
        <Select value={selectedStatus} onValueChange={(v) => onStatusChange(v as AlertStatus | 'all')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value={AlertStatus.ACTIVE}>Chưa đọc</SelectItem>
            <SelectItem value={AlertStatus.READ}>Đã đọc</SelectItem>
            <SelectItem value={AlertStatus.DISMISSED}>Đã bỏ qua</SelectItem>
            <SelectItem value={AlertStatus.RESOLVED}>Đã xử lý</SelectItem>
            <SelectItem value={AlertStatus.ESCALATED}>Đã escalate</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Mức độ
              {selectedPriorities.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {selectedPriorities.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-2">
              {allPriorities.map((priority) => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={selectedPriorities.includes(priority)}
                    onCheckedChange={() => togglePriority(priority)}
                  />
                  <Label
                    htmlFor={`priority-${priority}`}
                    className="text-sm cursor-pointer"
                  >
                    {getPriorityLabel(priority)}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Source Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Nguồn
              {selectedSources.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {selectedSources.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-2">
              {allSources.map((source) => (
                <div key={source} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${source}`}
                    checked={selectedSources.includes(source)}
                    onCheckedChange={() => toggleSource(source)}
                  />
                  <Label
                    htmlFor={`source-${source}`}
                    className="text-sm cursor-pointer"
                  >
                    {getSourceLabel(source)}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedPriorities.map((priority) => (
            <Badge
              key={priority}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => togglePriority(priority)}
            >
              {getPriorityLabel(priority)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {selectedSources.map((source) => (
            <Badge
              key={source}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleSource(source)}
            >
              {getSourceLabel(source)}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlertFilterBar;
