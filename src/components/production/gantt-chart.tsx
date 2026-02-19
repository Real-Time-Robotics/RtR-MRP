'use client';

// src/components/production/gantt-chart.tsx
// Production Gantt Chart Component

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  format,
  differenceInDays,
  addDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  isToday,
  isBefore,
  isAfter,
  isWithinInterval,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  Filter,
  Loader2,
  AlertTriangle,
  Play,
  Pause,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Types
export interface WorkOrder {
  id: string;
  woNumber: string;
  productName: string;
  quantity: number;
  completedQty: number;
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  assignedTo?: string;
  workCenter?: string;
  progress: number;
}

interface GanttChartProps {
  workOrders: WorkOrder[];
  onWorkOrderClick?: (wo: WorkOrder) => void;
  onReschedule?: (woId: string, newStart: Date, newEnd: Date) => Promise<void>;
  isLoading?: boolean;
}

type ViewMode = 'day' | 'week' | 'month';

// Status color configuration
const STATUS_COLORS: Record<WorkOrder['status'], { bg: string; border: string; text: string }> = {
  draft: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' },
  planned: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  in_progress: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' },
  completed: { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700' },
  on_hold: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' },
};

const PRIORITY_COLORS: Record<WorkOrder['priority'], string> = {
  low: 'bg-gray-400',
  normal: 'bg-blue-400',
  high: 'bg-orange-400',
  urgent: 'bg-red-500',
};

const STATUS_LABELS: Record<WorkOrder['status'], string> = {
  draft: 'Nháp',
  planned: 'Kế hoạch',
  in_progress: 'Đang SX',
  completed: 'Hoàn thành',
  on_hold: 'Tạm dừng',
};

export function GanttChart({
  workOrders,
  onWorkOrderClick,
  onReschedule,
  isLoading,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { locale: vi }));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [draggingWO, setDraggingWO] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate view range based on mode
  const viewRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return { start: viewStart, end: addDays(viewStart, 14) };
      case 'week':
        return { start: viewStart, end: addDays(viewStart, 28) };
      case 'month':
        return { start: startOfMonth(viewStart), end: endOfMonth(addDays(viewStart, 60)) };
      default:
        return { start: viewStart, end: addDays(viewStart, 28) };
    }
  }, [viewMode, viewStart]);

  // Get time slots (days or weeks)
  const timeSlots = useMemo(() => {
    if (viewMode === 'month') {
      return eachWeekOfInterval(viewRange, { locale: vi });
    }
    return eachDayOfInterval(viewRange);
  }, [viewRange, viewMode]);

  // Filter work orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      if (statusFilter !== 'all' && wo.status !== statusFilter) return false;

      // Check if WO is within view range
      const woStart = startOfDay(wo.plannedStart);
      const woEnd = endOfDay(wo.plannedEnd);

      return (
        isWithinInterval(woStart, viewRange) ||
        isWithinInterval(woEnd, viewRange) ||
        (isBefore(woStart, viewRange.start) && isAfter(woEnd, viewRange.end))
      );
    });
  }, [workOrders, statusFilter, viewRange]);

  // Calculate bar position and width
  const getBarStyle = useCallback(
    (wo: WorkOrder) => {
      const totalDays = differenceInDays(viewRange.end, viewRange.start) + 1;
      const startDay = Math.max(0, differenceInDays(wo.plannedStart, viewRange.start));
      const endDay = Math.min(
        totalDays,
        differenceInDays(wo.plannedEnd, viewRange.start) + 1
      );

      const left = (startDay / totalDays) * 100;
      const width = ((endDay - startDay) / totalDays) * 100;

      return {
        left: `${left}%`,
        width: `${Math.max(width, 2)}%`,
      };
    },
    [viewRange]
  );

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, woId: string) => {
    if (!onReschedule) return;
    setDraggingWO(woId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggingWO(null);
  };

  // Navigation
  const navigate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'day' ? 7 : viewMode === 'week' ? 14 : 30;
    setViewStart((prev) => addDays(prev, direction === 'next' ? days : -days));
  };

  const goToToday = () => {
    setViewStart(startOfWeek(new Date(), { locale: vi }));
  };

  // Check if WO is overdue
  const isOverdue = (wo: WorkOrder) => {
    return (
      wo.status !== 'completed' &&
      isBefore(wo.plannedEnd, new Date())
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate('prev')} aria-label="Trước">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Calendar className="w-4 h-4 mr-2" />
            Hôm nay
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate('next')} aria-label="Sau">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {format(viewRange.start, 'dd/MM/yyyy')} - {format(viewRange.end, 'dd/MM/yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="planned">Kế hoạch</SelectItem>
              <SelectItem value="in_progress">Đang SX</SelectItem>
              <SelectItem value="on_hold">Tạm dừng</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Ngày</SelectItem>
              <SelectItem value="week">Tuần</SelectItem>
              <SelectItem value="month">Tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg overflow-hidden" ref={chartRef}>
        {/* Header - Time axis */}
        <div className="flex border-b bg-gray-50">
          {/* Sidebar header */}
          <div className="w-64 flex-shrink-0 px-4 py-2 border-r font-medium">
            Lệnh sản xuất
          </div>
          {/* Time slots */}
          <div className="flex-1 flex">
            {timeSlots.map((slot, i) => {
              const isTodaySlot = isToday(slot);
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 text-center text-xs py-2 border-r last:border-r-0',
                    isTodaySlot && 'bg-blue-50 font-medium text-blue-700'
                  )}
                >
                  {viewMode === 'month'
                    ? format(slot, "'Tuần' w", { locale: vi })
                    : format(slot, viewMode === 'day' ? 'dd/MM' : 'EEE dd/MM', {
                        locale: vi,
                      })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body - Work order rows */}
        <div className="max-h-[500px] overflow-y-auto">
          {filteredWorkOrders.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Không có lệnh sản xuất trong khoảng thời gian này
            </div>
          ) : (
            filteredWorkOrders.map((wo) => {
              const barStyle = getBarStyle(wo);
              const colors = STATUS_COLORS[wo.status];
              const overdue = isOverdue(wo);

              return (
                <div key={wo.id} className="flex border-b last:border-b-0 hover:bg-gray-50">
                  {/* Sidebar - WO info */}
                  <div
                    className="w-64 flex-shrink-0 px-4 py-3 border-r cursor-pointer"
                    onClick={() => onWorkOrderClick?.(wo)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', PRIORITY_COLORS[wo.priority])} />
                      <span className="font-medium text-sm">{wo.woNumber}</span>
                      {overdue && (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {wo.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {STATUS_LABELS[wo.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {wo.completedQty}/{wo.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Chart area */}
                  <div className="flex-1 relative h-20">
                    {/* Today line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{
                        left: `${(differenceInDays(new Date(), viewRange.start) / differenceInDays(viewRange.end, viewRange.start)) * 100}%`,
                      }}
                    />

                    {/* Work order bar */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'absolute top-3 h-14 rounded-md border-2 cursor-pointer transition-shadow hover:shadow-md',
                            colors.bg,
                            colors.border,
                            overdue && 'border-red-500 animate-pulse',
                            draggingWO === wo.id && 'opacity-50'
                          )}
                          style={barStyle}
                          onClick={() => onWorkOrderClick?.(wo)}
                          draggable={!!onReschedule}
                          onDragStart={(e) => handleDragStart(e, wo.id)}
                          onDragEnd={handleDragEnd}
                        >
                          {/* Progress bar */}
                          <div
                            className={cn(
                              'absolute inset-y-0 left-0 rounded-l-md',
                              wo.status === 'completed'
                                ? 'bg-emerald-400/30'
                                : 'bg-blue-400/30'
                            )}
                            style={{ width: `${wo.progress}%` }}
                          />

                          {/* Content */}
                          <div className="relative h-full px-2 py-1 overflow-hidden">
                            <div className="flex items-center gap-1">
                              {wo.status === 'in_progress' && (
                                <Play className="w-3 h-3 text-green-600" />
                              )}
                              {wo.status === 'on_hold' && (
                                <Pause className="w-3 h-3 text-amber-600" />
                              )}
                              {wo.status === 'completed' && (
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                              )}
                              <span className="text-xs font-medium truncate">
                                {wo.woNumber}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {wo.productName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {wo.progress}% hoàn thành
                            </p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{wo.woNumber}</p>
                          <p className="text-sm">{wo.productName}</p>
                          <div className="text-xs text-muted-foreground">
                            <p>SL: {wo.completedQty}/{wo.quantity}</p>
                            <p>
                              {format(wo.plannedStart, 'dd/MM/yyyy')} -{' '}
                              {format(wo.plannedEnd, 'dd/MM/yyyy')}
                            </p>
                            {wo.assignedTo && <p>Phân công: {wo.assignedTo}</p>}
                            {wo.workCenter && <p>Work Center: {wo.workCenter}</p>}
                          </div>
                          {overdue && (
                            <p className="text-xs text-red-600 font-medium">
                              Quá hạn!
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-100 border-2 border-blue-300" />
          <span>Kế hoạch</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 border-2 border-green-400" />
          <span>Đang SX</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-400" />
          <span>Hoàn thành</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-400" />
          <span>Tạm dừng</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-0.5 h-4 bg-red-500" />
          <span>Hôm nay</span>
        </div>
      </div>
    </div>
  );
}

export default GanttChart;
