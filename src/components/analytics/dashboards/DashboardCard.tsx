"use client";

import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  LayoutDashboard,
  Edit,
  Trash2,
  Share2,
  Star,
  Eye,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { Dashboard } from "@/lib/analytics/types";

export interface DashboardCardProps {
  dashboard: Dashboard;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  className?: string;
}

export function DashboardCard({
  dashboard,
  onSelect,
  onEdit,
  onDelete,
  onShare,
  onSetDefault,
  className,
}: DashboardCardProps) {
  const widgetCount = dashboard.widgets?.length || 0;

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer group",
        dashboard.isDefault && "ring-2 ring-primary",
        className
      )}
      onClick={() => onSelect(dashboard.id)}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            {dashboard.name}
            {dashboard.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Mặc định
              </Badge>
            )}
          </CardTitle>
          {dashboard.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {dashboard.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Menu"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(dashboard.id);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </DropdownMenuItem>
            )}
            {onShare && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(dashboard.id);
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Chia sẻ
              </DropdownMenuItem>
            )}
            {onSetDefault && !dashboard.isDefault && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefault(dashboard.id);
                }}
              >
                <Star className="mr-2 h-4 w-4" />
                Đặt làm mặc định
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(dashboard.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            {widgetCount} widgets
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {dashboard.viewCount} lượt xem
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {dashboard.lastViewedAt
            ? `Xem ${formatDistanceToNow(new Date(dashboard.lastViewedAt), {
                addSuffix: true,
                locale: vi,
              })}`
            : `Tạo ${formatDistanceToNow(new Date(dashboard.createdAt), {
                addSuffix: true,
                locale: vi,
              })}`}
        </div>
        {dashboard.isPublic && (
          <Badge variant="outline" className="ml-auto text-xs">
            Công khai
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}

export default DashboardCard;
