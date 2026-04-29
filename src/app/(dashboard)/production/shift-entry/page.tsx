'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DowntimeQuickModal } from '@/components/production/downtime-quick-modal';
import { Play, Square, AlertTriangle, Clock, Package } from 'lucide-react';

// --- Types ---
interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface WorkOrder {
  id: string;
  woNumber: string;
  quantity: number;
  completedQty: number;
  scrapQty: number;
  status: string;
  product: { name: string };
}

interface ActiveShift {
  id: string;
  date: string;
  status: string;
  actualStart: string;
  workCenterId?: string;
  shift: Shift;
}

// --- Live Clock ---
function LiveClock({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime();
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="font-mono text-2xl font-bold text-emerald-600">{elapsed}</span>;
}

// --- Page ---
export default function ShiftEntryPage() {
  // State
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [assignedWOs, setAssignedWOs] = useState<WorkOrder[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workCenters, setWorkCenters] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Form state (State 1)
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedWC, setSelectedWC] = useState('');
  const [starting, setStarting] = useState(false);

  // Qty input modal
  const [qtyWO, setQtyWO] = useState<WorkOrder | null>(null);
  const [qtyProduced, setQtyProduced] = useState('');
  const [qtyScrapped, setQtyScrapped] = useState('');
  const [qtyNotes, setQtyNotes] = useState('');
  const [submittingQty, setSubmittingQty] = useState(false);

  // End shift modal
  const [endConfirm, setEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endSummary, setEndSummary] = useState<{ totalProduced: number; totalScrap: number; durationHours: number } | null>(null);

  // Downtime modal
  const [downtimeOpen, setDowntimeOpen] = useState(false);

  const fetchActive = useCallback(async () => {
    const res = await fetch('/api/production/shift-entry/active');
    const data = await res.json();
    setActiveShift(data.active);
    setAssignedWOs(data.assignedWOs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActive();
    // Load shifts + work centers
    fetch('/api/shifts').then((r) => r.ok ? r.json() : []).then((d) => setShifts(Array.isArray(d) ? d : d.shifts || [])).catch(() => {});
    fetch('/api/work-centers').then((r) => r.ok ? r.json() : []).then((d) => setWorkCenters(Array.isArray(d) ? d : d.workCenters || [])).catch(() => {});
  }, [fetchActive]);

  // Start shift
  const handleStart = async () => {
    if (!selectedShift || !selectedWC) return;
    setStarting(true);
    const res = await fetch('/api/production/shift-entry/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId: selectedShift,
        workCenterId: selectedWC,
        date: new Date().toISOString().split('T')[0],
      }),
    });
    if (res.ok) fetchActive();
    setStarting(false);
  };

  // Append qty
  const handleAppendQty = async () => {
    if (!qtyWO) return;
    setSubmittingQty(true);
    const res = await fetch('/api/production/shift-entry/append-qty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workOrderId: qtyWO.id,
        quantityProduced: parseInt(qtyProduced) || 0,
        quantityScrapped: parseInt(qtyScrapped) || 0,
        notes: qtyNotes || undefined,
      }),
    });
    if (res.ok) {
      setQtyWO(null);
      setQtyProduced('');
      setQtyScrapped('');
      setQtyNotes('');
      fetchActive();
    }
    setSubmittingQty(false);
  };

  // End shift
  const handleEnd = async () => {
    setEnding(true);
    const res = await fetch('/api/production/shift-entry/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      setEndSummary(data.summary);
    }
    setEnding(false);
  };

  const handleEndClose = () => {
    setEndConfirm(false);
    setEndSummary(null);
    fetchActive();
  };

  if (loading) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <p className="text-muted-foreground text-center py-12">Đang tải...</p>
      </div>
    );
  }

  // =================== STATE 1: Chưa bắt đầu ca ===================
  if (!activeShift) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-semibold text-center">Nhập ca</h1>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chưa bắt đầu ca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base">Work Center</Label>
              <select
                className="w-full border rounded-lg p-3 text-base mt-1"
                value={selectedWC}
                onChange={(e) => setSelectedWC(e.target.value)}
                aria-label="Chọn Work Center"
              >
                <option value="">-- Chọn Work Center --</option>
                {workCenters.map((wc) => (
                  <option key={wc.id} value={wc.id}>{wc.code} — {wc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-base">Ca làm việc</Label>
              <select
                className="w-full border rounded-lg p-3 text-base mt-1"
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                aria-label="Chọn ca làm việc"
              >
                <option value="">-- Chọn ca --</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>
                ))}
              </select>
            </div>

            <Button
              className="w-full h-14 text-lg"
              onClick={handleStart}
              disabled={!selectedWC || !selectedShift || starting}
              aria-label="Bắt đầu ca"
            >
              <Play className="h-5 w-5 mr-2" />
              {starting ? 'Đang bắt đầu...' : 'Bắt đầu ca'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =================== STATE 2: Đang trong ca ===================
  return (
    <div className="p-4 max-w-md mx-auto space-y-4 pb-24">
      {/* Shift header */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="secondary">{activeShift.shift?.name || 'Ca'}</Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Bắt đầu: {new Date(activeShift.actualStart).toLocaleTimeString('vi-VN')}
              </p>
            </div>
            <div className="text-right">
              <Clock className="h-4 w-4 inline mr-1 text-muted-foreground" />
              <LiveClock startTime={activeShift.actualStart} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WO list */}
      <div className="space-y-3">
        <h2 className="text-base font-medium">
          <Package className="h-4 w-4 inline mr-1" /> Work Orders ({assignedWOs.length})
        </h2>

        {assignedWOs.map((wo) => {
          const progress = wo.quantity > 0 ? Math.min(100, Math.round((wo.completedQty / wo.quantity) * 100)) : 0;
          const isComplete = wo.status === 'completed' || wo.completedQty >= wo.quantity;

          return (
            <Card key={wo.id} className={isComplete ? 'opacity-50' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{wo.woNumber}</span>
                    <p className="text-sm text-muted-foreground">{wo.product.name}</p>
                  </div>
                  {isComplete && <Badge variant="secondary">Hoàn thành</Badge>}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {wo.completedQty} / {wo.quantity} ({progress}%)
                  {wo.scrapQty > 0 && <span className="text-red-500 ml-2">Scrap: {wo.scrapQty}</span>}
                </p>

                {!isComplete && (
                  <Button
                    className="w-full mt-2 h-11"
                    onClick={() => setQtyWO(wo)}
                    aria-label={`Nhập số lượng cho ${wo.woNumber}`}
                  >
                    Nhập qty
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {assignedWOs.length === 0 && (
          <p className="text-muted-foreground text-center py-8">Không có WO nào được gán.</p>
        )}
      </div>

      {/* Floating buttons */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto flex gap-2">
        <Button
          variant="destructive"
          className="flex-1 h-12"
          onClick={() => setDowntimeOpen(true)}
          aria-label="Báo sự cố"
        >
          <AlertTriangle className="h-4 w-4 mr-2" /> Báo sự cố
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-12 border-amber-300 text-amber-700"
          onClick={() => setEndConfirm(true)}
          aria-label="Kết thúc ca"
        >
          <Square className="h-4 w-4 mr-2" /> Kết thúc ca
        </Button>
      </div>

      {/* Qty input modal */}
      <Dialog open={!!qtyWO} onOpenChange={(open) => !open && setQtyWO(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nhập số lượng — {qtyWO?.woNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-base">Qty sản xuất</Label>
              <Input
                type="number"
                inputMode="numeric"
                className="h-12 text-lg"
                value={qtyProduced}
                onChange={(e) => setQtyProduced(e.target.value)}
                placeholder="0"
                min={0}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-base">Qty phế phẩm</Label>
              <Input
                type="number"
                inputMode="numeric"
                className="h-12 text-lg"
                value={qtyScrapped}
                onChange={(e) => setQtyScrapped(e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Textarea
                value={qtyNotes}
                onChange={(e) => setQtyNotes(e.target.value)}
                placeholder="Không bắt buộc"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQtyWO(null)}>Huỷ</Button>
            <Button onClick={handleAppendQty} disabled={submittingQty}>
              {submittingQty ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End shift confirm */}
      <Dialog open={endConfirm} onOpenChange={setEndConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{endSummary ? 'Tổng kết ca' : 'Kết thúc ca?'}</DialogTitle>
          </DialogHeader>
          {endSummary ? (
            <div className="space-y-2 py-2">
              <p className="text-lg">Tổng sản xuất: <strong>{endSummary.totalProduced}</strong></p>
              <p className="text-lg">Tổng phế phẩm: <strong>{endSummary.totalScrap}</strong></p>
              <p className="text-lg">Thời gian: <strong>{endSummary.durationHours}h</strong></p>
            </div>
          ) : (
            <p className="text-muted-foreground">Xác nhận kết thúc ca hiện tại?</p>
          )}
          <DialogFooter>
            {endSummary ? (
              <Button onClick={handleEndClose} className="w-full">Đóng</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEndConfirm(false)}>Huỷ</Button>
                <Button variant="destructive" onClick={handleEnd} disabled={ending}>
                  {ending ? 'Đang kết thúc...' : 'Xác nhận'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downtime modal */}
      <DowntimeQuickModal
        open={downtimeOpen}
        onOpenChange={setDowntimeOpen}
        workCenterId={activeShift.workCenterId || ''}
        onSubmitted={fetchActive}
      />
    </div>
  );
}
