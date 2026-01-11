import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "bg-gray-100 text-gray-800" },
  released: { label: "Đã phát hành", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Đang thực hiện", className: "bg-purple-100 text-purple-800" },
  completed: { label: "Hoàn thành", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
  on_hold: { label: "Tạm dừng", className: "bg-amber-100 text-amber-800" },
};

export function WOStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  return <Badge className={config.className}>{config.label}</Badge>;
}
