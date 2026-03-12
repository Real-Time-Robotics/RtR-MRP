"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Factory,
  ArrowRightLeft,
  Handshake,
  Wrench,
  Pencil,
  MapPin,
  Trash2,
  Save,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useRoadmapAction } from "@/hooks/cost-optimization/use-roadmap-actions";

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  MAKE_VS_BUY: { icon: Factory, label: "Make vs Buy", color: "text-blue-600" },
  SUBSTITUTE: { icon: ArrowRightLeft, label: "Substitute", color: "text-green-600" },
  SUPPLIER_OPTIMIZE: { icon: Handshake, label: "Supplier Optimize", color: "text-purple-600" },
  PROCESS_IMPROVE: { icon: Wrench, label: "Process Improve", color: "text-orange-600" },
  DESIGN_CHANGE: { icon: Pencil, label: "Design Change", color: "text-pink-600" },
  LOCALIZE: { icon: MapPin, label: "Localize", color: "text-teal-600" },
};

const STATUS_OPTIONS = [
  { value: "IDEA", label: "Idea" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_PROGRESS_ACTION", label: "In Progress" },
  { value: "TESTING_ACTION", label: "Testing" },
  { value: "COMPLETED_ACTION", label: "Completed" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "CANCELLED_ACTION", label: "Cancelled" },
];

const RISK_BADGE: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export default function ActionDetailPage({
  params,
}: {
  params: Promise<{ targetId: string; actionId: string }>;
}) {
  const { targetId, actionId } = use(params);
  const router = useRouter();
  const { data: action, isLoading, mutate } = useRoadmapAction(actionId);
  const [updating, setUpdating] = useState(false);
  const [progressValue, setProgressValue] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!action) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Khong tim thay action
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[action.type] || TYPE_CONFIG.PROCESS_IMPROVE;
  const TypeIcon = typeConfig.icon;
  const currentProgress = progressValue ?? action.progressPercent;

  const handleUpdateProgress = async () => {
    if (progressValue === null) return;
    setUpdating(true);
    try {
      await fetch(
        `/api/cost-optimization/roadmap/actions/${actionId}/progress`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progressPercent: progressValue }),
        }
      );
      mutate();
      setProgressValue(null);
    } catch {
      // ignore
    }
    setUpdating(false);
  };

  const handleStatusChange = async (status: string) => {
    setUpdating(true);
    try {
      await fetch(`/api/cost-optimization/roadmap/actions/${actionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      mutate();
    } catch {
      // ignore
    }
    setUpdating(false);
  };

  const handleDelete = async () => {
    if (!confirm("Xoa action nay?")) return;
    try {
      await fetch(`/api/cost-optimization/roadmap/actions/${actionId}`, {
        method: "DELETE",
      });
      router.push(`/cost-optimization/roadmap/${targetId}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={action.description}
        description={`${action.phase.costTarget.name}`}
        backHref={`/cost-optimization/roadmap/${targetId}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TypeIcon className={cn("w-5 h-5", typeConfig.color)} />
                  {typeConfig.label}
                </CardTitle>
                <Badge className={RISK_BADGE[action.riskLevel] || "bg-gray-100 text-gray-700"}>
                  Risk: {action.riskLevel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Chi phi hien tai</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(action.currentCost)}/unit
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Chi phi muc tieu</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(action.targetCost)}/unit
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Savings/unit</div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(action.savingsPerUnit)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Annual savings</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(action.annualSavings)}/yr
                  </div>
                </div>
              </div>

              {action.investmentRequired > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-muted-foreground">Von dau tu</div>
                    <div className="font-medium">
                      {formatCurrency(action.investmentRequired)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Break-even</div>
                    <div className="font-medium">{action.breakEvenUnits} units</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">ROI</div>
                    <div className="font-medium">{action.roiMonths} thang</div>
                  </div>
                </div>
              )}

              {action.part && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">Linh kien</div>
                  <div className="font-medium font-mono">
                    {action.part.partNumber} — {action.part.name}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Bat dau</div>
                  <div className="font-medium">
                    {action.startDate ? formatDate(action.startDate) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Muc tieu hoan thanh</div>
                  <div className="font-medium">
                    {formatDate(action.targetCompletionDate)}
                  </div>
                </div>
              </div>

              {action.notes && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">Ghi chu</div>
                  <div className="text-sm mt-1">{action.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Status & Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status & Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Status</div>
                <Select
                  value={action.status}
                  onValueChange={handleStatusChange}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{currentProgress}%</span>
                </div>
                <Progress value={currentProgress} className="h-3" />
                <Slider
                  value={[currentProgress]}
                  onValueChange={([v]) => setProgressValue(v)}
                  max={100}
                  step={5}
                  className="mt-2"
                />
                {progressValue !== null && progressValue !== action.progressPercent && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleUpdateProgress}
                    disabled={updating}
                  >
                    {updating && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    <Save className="w-3 h-3 mr-1" />
                    Cap nhat {progressValue}%
                  </Button>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">Owner</div>
                <div className="font-medium">{action.owner.name}</div>
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card>
            <CardContent className="p-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Xoa action
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
