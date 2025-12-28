"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

interface GanttBarProps {
  workOrderNumber: string;
  operationName: string;
  start: Date;
  end: Date;
  status: string;
  hasConflict?: boolean;
  leftPercent: number;
  widthPercent: number;
  className?: string;
}

export function GanttBar({
  workOrderNumber,
  operationName,
  start,
  end,
  status,
  hasConflict,
  leftPercent,
  widthPercent,
  className,
}: GanttBarProps) {
  const getStatusColor = () => {
    if (hasConflict) return "bg-red-500";
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "scheduled":
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute h-6 rounded cursor-pointer transition-all hover:opacity-80",
              getStatusColor(),
              className
            )}
            style={{
              left: `${leftPercent}%`,
              width: `${Math.max(widthPercent, 2)}%`,
            }}
          >
            <div className="px-1 text-xs text-white truncate leading-6">
              {workOrderNumber}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-medium">{workOrderNumber}</div>
            <div className="text-sm">{operationName}</div>
            <div className="text-xs text-muted-foreground">
              {format(start, "MMM d, h:mm a")} - {format(end, "h:mm a")}
            </div>
            {hasConflict && (
              <div className="text-xs text-red-600 font-medium">Has conflict!</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
