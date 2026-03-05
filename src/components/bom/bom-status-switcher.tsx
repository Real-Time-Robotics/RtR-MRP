"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Archive, FileEdit, Loader2 } from "lucide-react";
import { clientLogger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/language-context";

interface BomStatusSwitcherProps {
  bomHeaderId: string;
  currentStatus: string;
}

const statusIcons: Record<string, typeof CheckCircle> = {
  draft: FileEdit,
  active: CheckCircle,
  obsolete: Archive,
};

const statusVariants: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  draft: "outline",
  active: "default",
  obsolete: "secondary",
};

const statusLabelKeys: Record<string, string> = {
  draft: "bomStatus.draft",
  active: "bomStatus.active",
  obsolete: "bomStatus.obsolete",
};

const transitions: Record<string, string[]> = {
  draft: ["active"],
  active: ["obsolete"],
  obsolete: ["draft"],
};

export function BomStatusSwitcher({ bomHeaderId, currentStatus }: BomStatusSwitcherProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const Icon = statusIcons[currentStatus] || FileEdit;
  const variant = statusVariants[currentStatus] || "outline";
  const label = t(statusLabelKeys[currentStatus] || "bomStatus.draft");
  const availableTransitions = transitions[currentStatus] || [];

  const handleStatusChange = async (newStatus: string) => {
    const confirmMessages: Record<string, string> = {
      active: t("bomStatus.confirmActive"),
      obsolete: t("bomStatus.confirmObsolete"),
    };

    const targetLabel = t(statusLabelKeys[newStatus] || "bomStatus.draft");
    if (!confirm(confirmMessages[newStatus] || t("bomStatus.confirmTransition", { status: targetLabel }))) return;

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
        toast.error(error.error || t("bomStatus.updateError"));
      }
    } catch (error) {
      clientLogger.error("Failed to update BOM status", error);
      toast.error(t("bomStatus.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (availableTransitions.length === 0) {
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
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
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {availableTransitions.map((status) => {
          const TargetIcon = statusIcons[status] || FileEdit;
          const targetLabel = t(statusLabelKeys[status] || "bomStatus.draft");
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
            >
              <TargetIcon className="h-4 w-4 mr-2" />
              {t("bomStatus.switchTo", { label: targetLabel })}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
