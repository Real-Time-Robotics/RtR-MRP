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
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Search */}
        <div className="relative w-48 lg:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm alerts..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Status Select */}
        <Select value={selectedStatus} onValueChange={(v) => onStatusChange(v as AlertStatus | 'all')}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
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
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
              <Filter className="h-3.5 w-3.5" />
              Mức độ
              {selectedPriorities.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 p-0 justify-center text-[10px]">
                  {selectedPriorities.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              {allPriorities.map((priority) => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={selectedPriorities.includes(priority)}
                    onCheckedChange={() => togglePriority(priority)}
                  />
                  <Label htmlFor={`priority-${priority}`} className="text-sm cursor-pointer">
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
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
              <Filter className="h-3.5 w-3.5" />
              Nguồn
              {selectedSources.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 p-0 justify-center text-[10px]">
                  {selectedSources.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              {allSources.map((source) => (
                <div key={source} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${source}`}
                    checked={selectedSources.includes(source)}
                    onCheckedChange={() => toggleSource(source)}
                  />
                  <Label htmlFor={`source-${source}`} className="text-sm cursor-pointer">
                    {getSourceLabel(source)}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Active filter badges inline */}
        {selectedPriorities.map((priority) => (
          <Badge
            key={priority}
            variant="secondary"
            className="cursor-pointer h-6 text-[10px] px-1.5"
            onClick={() => togglePriority(priority)}
          >
            {getPriorityLabel(priority)}
            <X className="h-3 w-3 ml-0.5" />
          </Badge>
        ))}
        {selectedSources.map((source) => (
          <Badge
            key={source}
            variant="secondary"
            className="cursor-pointer h-6 text-[10px] px-1.5"
            onClick={() => toggleSource(source)}
          >
            {getSourceLabel(source)}
            <X className="h-3 w-3 ml-0.5" />
          </Badge>
        ))}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-8 px-2 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default AlertFilterBar;
