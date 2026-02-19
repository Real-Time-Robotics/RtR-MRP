"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  MoreHorizontal,
  FileImage,
  FileSpreadsheet,
} from "lucide-react";

export interface ChartToolbarProps {
  onExportPNG?: () => void;
  onExportCSV?: () => void;
  onFullscreen?: () => void;
  onResetZoom?: () => void;
  isFullscreen?: boolean;
  showExport?: boolean;
  showFullscreen?: boolean;
  showResetZoom?: boolean;
}

export function ChartToolbar({
  onExportPNG,
  onExportCSV,
  onFullscreen,
  onResetZoom,
  isFullscreen = false,
  showExport = true,
  showFullscreen = true,
  showResetZoom = true,
}: ChartToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      {showResetZoom && onResetZoom && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onResetZoom}
          title="Đặt lại zoom"
          aria-label="Đặt lại zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}

      {showFullscreen && onFullscreen && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onFullscreen}
          title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      )}

      {showExport && (onExportPNG || onExportCSV) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Xuất dữ liệu">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onExportPNG && (
              <DropdownMenuItem onClick={onExportPNG}>
                <FileImage className="mr-2 h-4 w-4" />
                Xuất PNG
              </DropdownMenuItem>
            )}
            {onExportCSV && (
              <DropdownMenuItem onClick={onExportCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Xuất CSV
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default ChartToolbar;
