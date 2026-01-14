import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
  planned: { label: "Đã lên kế hoạch", className: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200" },
  released: { label: "Đã phát hành", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  in_progress: { label: "Đang thực hiện", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  completed: { label: "Hoàn thành", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  on_hold: { label: "Tạm dừng", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  closed: { label: "Đã đóng", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
};

export function WOStatusBadge({ status }: { status: string }) {
  // Normalize status to lowercase to handle both "DRAFT" and "draft"
  const normalizedStatus = status?.toLowerCase().replace(/-/g, '_') || 'draft';
  const config = statusConfig[normalizedStatus] || statusConfig.draft;
  return <Badge className={config.className}>{config.label}</Badge>;
}
