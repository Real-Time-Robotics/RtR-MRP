"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Archive, FileEdit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface BomStatusSwitcherProps {
  bomHeaderId: string;
  currentStatus: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive"; icon: typeof CheckCircle }> = {
  draft: { label: "Draft", variant: "outline", icon: FileEdit },
  active: { label: "Active", variant: "default", icon: CheckCircle },
  obsolete: { label: "Obsolete", variant: "secondary", icon: Archive },
};

const transitions: Record<string, string[]> = {
  draft: ["active"],
  active: ["obsolete"],
  obsolete: [],
};

export function BomStatusSwitcher({ bomHeaderId, currentStatus }: BomStatusSwitcherProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const config = statusConfig[currentStatus] || statusConfig.draft;
  const Icon = config.icon;
  const availableTransitions = transitions[currentStatus] || [];

  const handleStatusChange = async (newStatus: string) => {
    const confirmMessages: Record<string, string> = {
      active: "Kích hoạt BOM này? BOM sẽ được sử dụng khi tạo Work Order.",
      obsolete: "Đánh dấu BOM lỗi thời? BOM sẽ không thể chỉnh sửa hoặc sử dụng nữa.",
    };

    if (!confirm(confirmMessages[newStatus] || `Chuyển sang ${newStatus}?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/bom/${bomHeaderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.error || "Không thể cập nhật trạng thái");
      }
    } catch (error) {
      console.error("Failed to update BOM status:", error);
      alert("Lỗi cập nhật trạng thái BOM");
    } finally {
      setLoading(false);
    }
  };

  if (availableTransitions.length === 0) {
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
          {config.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {availableTransitions.map((status) => {
          const targetConfig = statusConfig[status];
          const TargetIcon = targetConfig.icon;
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
            >
              <TargetIcon className="h-4 w-4 mr-2" />
              Chuyển sang {targetConfig.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
