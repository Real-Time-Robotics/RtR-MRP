'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaintenanceWeekWidget } from '@/components/production/maintenance-week-widget';
import { Plus, Check, AlertTriangle, GripVertical, Calendar } from 'lucide-react';

// --- Types ---
interface PlanLine {
  id: string;
  sequence: number;
  plannedQty: number;
  estimatedStartTime: string | null;
  estimatedEndTime: string | null;
  notes: string | null;
  workOrder: { id: string; woNumber: string; quantity: number; completedQty: number; status: string; dueDate: string | null; product: { name: string } };
  assignedToUser: { id: string; name: string | null } | null;
}

interface DailyPlan {
  id: string;
  planNumber: string;
  date: string;
  status: string;
  notes: string | null;
  workCenter: { id: string; code: string; name: string };
  createdByUser: { id: string; name: string | null } | null;
  approvedByUser: { id: string; name: string | null } | null;
  lines: PlanLine[];
}

interface LateWO {
  id: string;
  woNumber: string;
  quantity: number;
  completedQty: number;
  status: string;
  dueDate: string;
  product: { name: string };
}

// --- Helpers ---
const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'border-dashed border-slate-300',
  APPROVED: 'border-solid border-emerald-400',
  IN_PROGRESS: 'border-solid border-blue-400',
  COMPLETED: 'border-solid border-slate-200 opacity-60',
  CANCELLED: 'border-solid border-red-200 opacity-40',
};

function getWeekDates(refDate: Date): Date[] {
  const day = refDate.getDay();
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// --- Page ---
export default function DailyPlanPage() {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [lateWOs, setLateWOs] = useState<LateWO[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [workCenters, setWorkCenters] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [selectedWC, setSelectedWC] = useState('');
  const [addLineDialog, setAddLineDialog] = useState<{ planId: string; date: string } | null>(null);
  const [addLineWoId, setAddLineWoId] = useState('');
  const [addLineQty, setAddLineQty] = useState('');

  const refDate = new Date();
  refDate.setDate(refDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(refDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = formatDate(weekDates[0]);
    const to = formatDate(weekDates[6]);
    const wcParam = selectedWC ? `&workCenterId=${selectedWC}` : '';

    const [plansRes, lateRes] = await Promise.all([
      fetch(`/api/production/daily-plan?from=${from}&to=${to}${wcParam}`),
      fetch(`/api/production/daily-plan/late-wos?date=${formatDate(new Date())}`),
    ]);

    const plansData = await plansRes.json();
    const lateData = await lateRes.json();
    setPlans(plansData.plans || []);
    setLateWOs(lateData.lateWOs || []);
    setLoading(false);
  }, [weekOffset, selectedWC]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch work centers on mount
  useEffect(() => {
    fetch('/api/production/equipment?status=operational')
      .then((r) => r.json())
      .then(() => {
        // Fallback: get work centers from plans or use a dedicated endpoint
        // For now, extract unique work centers from plans
      });
    // Get work centers
    fetch('/api/work-centers')
      .then((r) => r.ok ? r.json() : { workCenters: [] })
      .then((data) => setWorkCenters(data.workCenters || data || []))
      .catch(() => {});
  }, []);

  const createPlan = async (date: string) => {
    if (!selectedWC) return;
    const res = await fetch('/api/production/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, workCenterId: selectedWC }),
    });
    if (res.ok) fetchData();
  };

  const approvePlan = async (planId: string) => {
    const res = await fetch(`/api/production/daily-plan/${planId}/approve`, { method: 'POST' });
    if (res.ok) fetchData();
  };

  const addLine = async () => {
    if (!addLineDialog || !addLineWoId) return;
    const res = await fetch(`/api/production/daily-plan/${addLineDialog.planId}/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workOrderId: addLineWoId,
        plannedQty: parseInt(addLineQty) || 1,
      }),
    });
    if (res.ok) {
      setAddLineDialog(null);
      setAddLineWoId('');
      setAddLineQty('');
      fetchData();
    }
  };

  const getPlanForDate = (date: Date): DailyPlan | undefined => {
    const dateStr = formatDate(date);
    return plans.find((p) => p.date.startsWith(dateStr));
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Kế hoạch ngày</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-md px-3 py-1.5 text-sm"
            value={selectedWC}
            onChange={(e) => setSelectedWC(e.target.value)}
            aria-label="Chọn work center"
          >
            <option value="">Tất cả work center</option>
            {workCenters.map((wc) => (
              <option key={wc.id} value={wc.id}>
                {wc.code} — {wc.name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            ← Tuần trước
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            <Calendar className="h-4 w-4 mr-1" /> Hôm nay
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            Tuần sau →
          </Button>
        </div>
      </div>

      {/* Maintenance widget */}
      <MaintenanceWeekWidget days={7} />

      {/* Late WOs alert */}
      {lateWOs.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" /> {lateWOs.length} WO trễ hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lateWOs.slice(0, 5).map((wo) => (
                <Badge key={wo.id} variant="destructive" className="text-xs">
                  {wo.woNumber} · {wo.product.name} · hạn {new Date(wo.dueDate).toLocaleDateString('vi-VN')}
                </Badge>
              ))}
              {lateWOs.length > 5 && (
                <Badge variant="outline" className="text-xs">+{lateWOs.length - 5} nữa</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly grid */}
      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const plan = getPlanForDate(date);
            const isToday = formatDate(date) === formatDate(new Date());

            return (
              <div
                key={formatDate(date)}
                className={`min-h-[300px] rounded-lg border-2 p-2 ${
                  plan ? STATUS_STYLES[plan.status] || '' : 'border-dashed border-slate-200'
                } ${isToday ? 'bg-blue-50/30' : ''}`}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">{DAY_LABELS[i]}</span>
                    <span className={`text-sm font-semibold ml-1 ${isToday ? 'text-blue-600' : ''}`}>
                      {date.getDate()}/{date.getMonth() + 1}
                    </span>
                  </div>
                  {plan && (
                    <Badge variant={plan.status === 'APPROVED' ? 'default' : 'secondary'} className="text-[10px]">
                      {plan.status}
                    </Badge>
                  )}
                </div>

                {/* Plan content */}
                {plan ? (
                  <div className="space-y-1.5">
                    {plan.lines.map((line) => (
                      <div
                        key={line.id}
                        className={`p-1.5 rounded text-xs border bg-white ${
                          line.workOrder.status === 'completed' ? 'line-through opacity-50' : ''
                        } ${
                          line.workOrder.dueDate && new Date(line.workOrder.dueDate) < new Date() && line.workOrder.status !== 'completed'
                            ? 'border-red-300 bg-red-50'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-3 w-3 text-slate-300 cursor-grab" />
                          <span className="font-medium truncate">{line.workOrder.woNumber}</span>
                          {line.workOrder.status === 'completed' && <Check className="h-3 w-3 text-emerald-500" />}
                        </div>
                        <div className="text-muted-foreground truncate">{line.plannedQty} pcs</div>
                        {line.assignedToUser && (
                          <div className="text-muted-foreground truncate">→ {line.assignedToUser.name}</div>
                        )}
                      </div>
                    ))}

                    {/* Actions */}
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs flex-1"
                        onClick={() => setAddLineDialog({ planId: plan.id, date: formatDate(date) })}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Thêm WO
                      </Button>
                      {plan.status === 'DRAFT' && plan.lines.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-emerald-600"
                          onClick={() => approvePlan(plan.id)}
                        >
                          <Check className="h-3 w-3 mr-1" /> Duyệt
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => createPlan(formatDate(date))}
                      disabled={!selectedWC}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Tạo plan
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add line dialog */}
      <Dialog open={!!addLineDialog} onOpenChange={(open) => !open && setAddLineDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Work Order vào plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>WO ID</Label>
              <Input
                value={addLineWoId}
                onChange={(e) => setAddLineWoId(e.target.value)}
                placeholder="Nhập Work Order ID..."
              />
            </div>
            <div>
              <Label>Số lượng kế hoạch</Label>
              <Input
                type="number"
                value={addLineQty}
                onChange={(e) => setAddLineQty(e.target.value)}
                placeholder="1"
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLineDialog(null)}>Huỷ</Button>
            <Button onClick={addLine} disabled={!addLineWoId}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
