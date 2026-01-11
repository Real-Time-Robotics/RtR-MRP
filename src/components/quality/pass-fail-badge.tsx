"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

type ResultType = "PASS" | "FAIL" | "CONDITIONAL" | "PENDING" | null;

interface PassFailBadgeProps {
  result: ResultType;
  size?: "sm" | "md";
}

const config = {
  PASS: {
    label: "Đạt",
    className: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  FAIL: {
    label: "Không đạt",
    className: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  CONDITIONAL: {
    label: "Có điều kiện",
    className: "bg-amber-100 text-amber-800",
    icon: AlertTriangle,
  },
  PENDING: {
    label: "Chờ xử lý",
    className: "bg-gray-100 text-gray-800",
    icon: Clock,
  },
};

export function PassFailBadge({ result, size = "md" }: PassFailBadgeProps) {
  const { label, className, icon: Icon } = config[result || "PENDING"];

  return (
    <Badge className={`${className} gap-1`}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      {label}
    </Badge>
  );
}
