'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { format, addDays, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkOrderBar, WorkOrderBarData } from './work-order-bar';
import { TimelineHeader } from './timeline-header';

// =============================================================================
// TYPES
// =============================================================================

export type ViewMode = 'day' | 'week' | 'month';

export interface GanttWorkOrder {
  id: string;
  workOrderNumber: string;
  productName: string;
  quantity: number;
  workCenterId: string;
  workCenterName: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'delayed';
  priority: number;
  progress: number;
  hasConflict: boolean;
  conflictType?: string;
  dueDate?: Date;
}

export interface GanttWorkCenter {
  id: string;
  name: string;
  capacity: number;
  utilization: number;
}

export interface GanttConflict {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  workOrderIds: string[];
  description: string;
}

export interface GanttChartProps {
  workOrders: GanttWorkOrder[];
  workCenters: GanttWorkCenter[];
  conflicts?: GanttConflict[];
  startDate?: Date;
  endDate?: Date;
  viewMode?: ViewMode;
  onWorkOrderClick?: (workOrder: GanttWorkOrder) => void;
  onWorkOrderDrag?: (workOrderId: string, newStartDate: Date, newWorkCenterId: string) => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DAY_WIDTH = {
  day: 60,
  week: 40,
  month: 20,
};

const ROW_HEIGHT = 50;
const HEADER_HEIGHT = 60;
const WORK_CENTER_WIDTH = 180;

// =============================================================================
// GANTT CHART COMPONENT
// =============================================================================

export function GanttChart({
  workOrders,
  workCenters,
  conflicts = [],
  startDate: initialStartDate,
  endDate: initialEndDate,
  viewMode: initialViewMode = 'week',
  onWorkOrderClick,
  onWorkOrderDrag,
  onDateRangeChange,
  className,
}: GanttChartProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWorkOrder, setDraggedWorkOrder] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    let start: Date;
    let end: Date;

    if (initialStartDate && initialEndDate) {
      start = initialStartDate;
      end = initialEndDate;
    } else {
      switch (viewMode) {
        case 'day':
          start = addDays(currentDate, -3);
          end = addDays(currentDate, 10);
          break;
        case 'week':
          start = startOfWeek(currentDate, { locale: vi });
          end = addDays(start, 28); // 4 weeks
          break;
        case 'month':
          start = startOfWeek(currentDate, { locale: vi });
          end = addDays(start, 60); // ~2 months
          break;
        default:
          start = startOfWeek(currentDate, { locale: vi });
          end = addDays(start, 28);
      }
    }

    return { start, end, days: eachDayOfInterval({ start, end }) };
  }, [viewMode, currentDate, initialStartDate, initialEndDate]);

  // Calculate grid dimensions
  const gridWidth = dateRange.days.length * DAY_WIDTH[viewMode];
  const gridHeight = workCenters.length * ROW_HEIGHT;

  // Group work orders by work center
  const workOrdersByWorkCenter = useMemo(() => {
    const grouped = new Map<string, GanttWorkOrder[]>();
    workCenters.forEach((wc) => grouped.set(wc.id, []));

    workOrders.forEach((wo) => {
      const existing = grouped.get(wo.workCenterId) || [];
      existing.push(wo);
      grouped.set(wo.workCenterId, existing);
    });

    return grouped;
  }, [workOrders, workCenters]);

  // Convert work order to bar position
  const getBarPosition = useCallback(
    (workOrder: GanttWorkOrder) => {
      const startOffset = differenceInDays(workOrder.startDate, dateRange.start);
      const duration = differenceInDays(workOrder.endDate, workOrder.startDate) + 1;
      const wcIndex = workCenters.findIndex((wc) => wc.id === workOrder.workCenterId);

      return {
        left: startOffset * DAY_WIDTH[viewMode],
        width: Math.max(duration * DAY_WIDTH[viewMode] - 4, 20), // Min width 20px
        top: wcIndex * ROW_HEIGHT + 8,
        height: ROW_HEIGHT - 16,
      };
    },
    [dateRange.start, viewMode, workCenters]
  );

  // Navigation handlers
  const navigatePrev = () => {
    const days = viewMode === 'day' ? 7 : viewMode === 'week' ? 14 : 30;
    setCurrentDate(addDays(currentDate, -days));
    onDateRangeChange?.(addDays(dateRange.start, -days), addDays(dateRange.end, -days));
  };

  const navigateNext = () => {
    const days = viewMode === 'day' ? 7 : viewMode === 'week' ? 14 : 30;
    setCurrentDate(addDays(currentDate, days));
    onDateRangeChange?.(addDays(dateRange.start, days), addDays(dateRange.end, days));
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Drag handlers
  const handleDragStart = (workOrderId: string) => {
    setIsDragging(true);
    setDraggedWorkOrder(workOrderId);
  };

  const handleDragEnd = (
    workOrderId: string,
    dropX: number,
    dropY: number
  ) => {
    if (!onWorkOrderDrag) return;

    const dayOffset = Math.floor(dropX / DAY_WIDTH[viewMode]);
    const newStartDate = addDays(dateRange.start, dayOffset);

    const wcIndex = Math.floor(dropY / ROW_HEIGHT);
    const newWorkCenterId = workCenters[wcIndex]?.id;

    if (newWorkCenterId) {
      onWorkOrderDrag(workOrderId, newStartDate, newWorkCenterId);
    }

    setIsDragging(false);
    setDraggedWorkOrder(null);
  };

  // Get status color for work order bar
  const getStatusColor = (wo: GanttWorkOrder): string => {
    if (wo.hasConflict) return 'bg-red-500';
    if (wo.dueDate && wo.endDate > wo.dueDate) return 'bg-orange-500';

    switch (wo.status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'delayed':
        return 'bg-red-400';
      case 'scheduled':
        return 'bg-emerald-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={cn('flex flex-col border rounded-lg bg-white', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={navigateToday}>
            <Calendar className="h-4 w-4 mr-1" />
            Hôm nay
          </Button>
          <Button variant="outline" size="sm" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-sm font-medium">
          {format(dateRange.start, 'dd/MM/yyyy', { locale: vi })} -{' '}
          {format(dateRange.end, 'dd/MM/yyyy', { locale: vi })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Xem theo:</span>
          <div className="flex rounded-md border">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={cn(
                  'px-3 py-1 text-sm',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white hover:bg-gray-50'
                )}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'day' ? 'Ngày' : mode === 'week' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Work Center Labels (Fixed Left) */}
        <div className="flex-shrink-0 border-r bg-gray-50" style={{ width: WORK_CENTER_WIDTH }}>
          {/* Header spacer */}
          <div
            className="border-b px-3 py-2 font-medium text-sm"
            style={{ height: HEADER_HEIGHT }}
          >
            Trung tâm SX
          </div>

          {/* Work center rows */}
          {workCenters.map((wc, index) => (
            <div
              key={wc.id}
              className={cn(
                'flex items-center px-3 border-b',
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              )}
              style={{ height: ROW_HEIGHT }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{wc.name}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        wc.utilization > 90
                          ? 'bg-red-500'
                          : wc.utilization > 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      )}
                      style={{ width: `${Math.min(wc.utilization, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{wc.utilization}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Timeline Area */}
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div style={{ width: gridWidth, minWidth: '100%' }}>
            {/* Timeline Header */}
            <TimelineHeader
              days={dateRange.days}
              viewMode={viewMode}
              dayWidth={DAY_WIDTH[viewMode]}
              height={HEADER_HEIGHT}
            />

            {/* Grid and Work Orders */}
            <div className="relative" style={{ height: gridHeight }}>
              {/* Grid Lines */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={gridWidth}
                height={gridHeight}
              >
                {/* Vertical lines (days) */}
                {dateRange.days.map((day, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * DAY_WIDTH[viewMode]}
                    y1={0}
                    x2={i * DAY_WIDTH[viewMode]}
                    y2={gridHeight}
                    stroke={isToday(day) ? '#30a46c' : '#e5e7eb'}
                    strokeWidth={isToday(day) ? 2 : 1}
                  />
                ))}

                {/* Horizontal lines (rows) */}
                {workCenters.map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={(i + 1) * ROW_HEIGHT}
                    x2={gridWidth}
                    y2={(i + 1) * ROW_HEIGHT}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                ))}

                {/* Today indicator */}
                {dateRange.days.findIndex((d) => isToday(d)) >= 0 && (
                  <rect
                    x={dateRange.days.findIndex((d) => isToday(d)) * DAY_WIDTH[viewMode]}
                    y={0}
                    width={DAY_WIDTH[viewMode]}
                    height={gridHeight}
                    fill="#30a46c"
                    opacity={0.05}
                  />
                )}
              </svg>

              {/* Work Order Bars */}
              <TooltipProvider>
                {workOrders.map((wo) => {
                  const pos = getBarPosition(wo);

                  // Check if work order is in visible range
                  if (pos.left + pos.width < 0 || pos.left > gridWidth) {
                    return null;
                  }

                  return (
                    <WorkOrderBar
                      key={wo.id}
                      data={{
                        ...wo,
                        color: getStatusColor(wo),
                      }}
                      position={pos}
                      isDragging={draggedWorkOrder === wo.id}
                      onDragStart={() => handleDragStart(wo.id)}
                      onDragEnd={(x, y) => handleDragEnd(wo.id, x, y)}
                      onClick={() => onWorkOrderClick?.(wo)}
                    />
                  );
                })}
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t bg-gray-50 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span>Đã lên lịch</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Đang thực hiện</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Hoàn thành</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Có rủi ro</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Xung đột</span>
        </div>
      </div>
    </div>
  );
}

export default GanttChart;
