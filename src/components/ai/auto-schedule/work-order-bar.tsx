'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkOrderBarData {
  id: string;
  workOrderNumber: string;
  productName: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
  status: string;
  priority: number;
  progress: number;
  hasConflict: boolean;
  conflictType?: string;
  dueDate?: Date;
  color: string;
}

export interface WorkOrderBarProps {
  data: WorkOrderBarData;
  position: {
    left: number;
    width: number;
    top: number;
    height: number;
  };
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onClick?: () => void;
}

// =============================================================================
// WORK ORDER BAR COMPONENT
// =============================================================================

export function WorkOrderBar({
  data,
  position,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onClick,
}: WorkOrderBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onDragStart) return;

    e.preventDefault();
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Could implement live preview here
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const deltaX = upEvent.clientX - dragStartPos.current.x;
      const deltaY = upEvent.clientY - dragStartPos.current.y;

      // Only trigger drag if moved significantly
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        onDragEnd?.(position.left + deltaX, position.top + deltaY);
      } else {
        onClick?.();
      }
    };

    onDragStart();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 90) return 'Khẩn cấp';
    if (priority >= 70) return 'Cao';
    if (priority >= 50) return 'Trung bình';
    return 'Thấp';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Chờ xử lý',
      scheduled: 'Đã lên lịch',
      in_progress: 'Đang thực hiện',
      completed: 'Hoàn thành',
      delayed: 'Trễ hạn',
    };
    return labels[status] || status;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={barRef}
          className={cn(
            'absolute rounded cursor-pointer transition-all duration-150',
            'shadow-sm hover:shadow-md hover:z-10',
            data.hasConflict && 'ring-2 ring-red-500 ring-offset-1',
            isDragging && 'opacity-70 scale-105',
            data.color
          )}
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            height: position.height,
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Progress bar */}
          {data.progress > 0 && (
            <div
              className="absolute inset-0 bg-black/20 rounded-l"
              style={{ width: `${data.progress}%` }}
            />
          )}

          {/* Content */}
          <div className="relative h-full px-2 py-1 flex items-center gap-1 text-white overflow-hidden">
            {/* Conflict indicator */}
            {data.hasConflict && (
              <AlertTriangle className="h-3 w-3 flex-shrink-0 text-white" />
            )}

            {/* Work order number */}
            <span className="text-xs font-medium truncate">
              {data.workOrderNumber}
            </span>

            {/* Priority indicator for high priority */}
            {data.priority >= 70 && (
              <span className="text-[10px] px-1 bg-white/30 rounded">
                !
              </span>
            )}
          </div>

          {/* Resize handle (right edge) */}
          <div
            className={cn(
              'absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize',
              'opacity-0 hover:opacity-100 bg-white/30'
            )}
          />
        </div>
      </TooltipTrigger>

      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">{data.workOrderNumber}</span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                data.priority >= 70 ? 'bg-red-100 text-red-700' : 'bg-gray-100'
              )}
            >
              {getPriorityLabel(data.priority)}
            </span>
          </div>

          {/* Product info */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-gray-400" />
            <span>
              {data.productName} × {data.quantity.toLocaleString()}
            </span>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>
              {format(data.startDate, 'dd/MM', { locale: vi })} -{' '}
              {format(data.endDate, 'dd/MM', { locale: vi })}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Trạng thái:</span>
            <span className={cn('font-medium', data.color.replace('bg-', 'text-'))}>
              {getStatusLabel(data.status)}
            </span>
          </div>

          {/* Progress */}
          {data.progress > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Tiến độ:</span>
              <span className="font-medium">{data.progress}%</span>
            </div>
          )}

          {/* Conflict warning */}
          {data.hasConflict && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
              <AlertTriangle className="h-4 w-4" />
              <span>{data.conflictType || 'Có xung đột lịch trình'}</span>
            </div>
          )}

          {/* Due date warning */}
          {data.dueDate && data.endDate > data.dueDate && (
            <div className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Dự kiến trễ hạn {format(data.dueDate, 'dd/MM/yyyy', { locale: vi })}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default WorkOrderBar;
