"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  RefreshCw,
  Settings,
  Maximize2,
  Download,
  Trash2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WidgetContainerProps {
  id: string;
  title: string;
  titleVi?: string;
  isLoading?: boolean;
  error?: string | null;
  refreshInterval?: number;
  showDragHandle?: boolean;
  showActions?: boolean;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onFullscreen?: () => void;
  onExport?: () => void;
  onRemove?: () => void;
  className?: string;
  children: React.ReactNode;
}

export function WidgetContainer({
  id,
  title,
  titleVi,
  isLoading = false,
  error = null,
  refreshInterval,
  showDragHandle = true,
  showActions = true,
  onRefresh,
  onConfigure,
  onFullscreen,
  onExport,
  onRemove,
  className,
  children,
}: WidgetContainerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayTitle = titleVi || title;

  // Auto-refresh logic
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      onRefresh?.();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval, onRefresh]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [onRefresh]);

  return (
    <Card className={cn("h-full flex flex-col overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
        <div className="flex items-center gap-2">
          {showDragHandle && (
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
          )}
          <CardTitle className="text-sm font-medium">{displayTitle}</CardTitle>
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                aria-label="Làm mới"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    (isLoading || isRefreshing) && "animate-spin"
                  )}
                />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Menu">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onConfigure && (
                  <DropdownMenuItem onClick={onConfigure}>
                    <Settings className="mr-2 h-4 w-4" />
                    Cấu hình
                  </DropdownMenuItem>
                )}
                {onFullscreen && (
                  <DropdownMenuItem onClick={onFullscreen}>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Toàn màn hình
                  </DropdownMenuItem>
                )}
                {onExport && (
                  <DropdownMenuItem onClick={onExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Xuất dữ liệu
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem
                    onClick={onRemove}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa widget
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-4 pt-0 overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-sm text-destructive">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default WidgetContainer;
