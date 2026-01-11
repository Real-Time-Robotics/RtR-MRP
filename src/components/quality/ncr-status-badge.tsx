"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Mở", className: "bg-blue-100 text-blue-800" },
  under_review: { label: "Đang xem xét", className: "bg-purple-100 text-purple-800" },
  pending_disposition: { label: "Chờ xử lý", className: "bg-amber-100 text-amber-800" },
  disposition_approved: { label: "Đã duyệt", className: "bg-teal-100 text-teal-800" },
  in_rework: { label: "Đang sửa chữa", className: "bg-orange-100 text-orange-800" },
  pending_verification: { label: "Chờ xác minh", className: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Hoàn thành", className: "bg-green-100 text-green-800" },
  closed: { label: "Đã đóng", className: "bg-gray-100 text-gray-800" },
  voided: { label: "Hủy bỏ", className: "bg-red-100 text-red-800" },
};

export function NCRStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.open;
  return <Badge className={config.className}>{config.label}</Badge>;
}
