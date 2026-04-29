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
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface DowntimeRecord {
  id: string;
  workCenterId: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  type: string;
  reason: string;
  category: string | null;
  reportedBy: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  workCenter?: { id: string; code: string; name: string };
}

const TYPE_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  UNPLANNED: 'bg-amber-100 text-amber-700',
  MAINTENANCE: 'bg-purple-100 text-purple-700',
  BREAKDOWN: 'bg-red-100 text-red-700',
  CHANGEOVER: 'bg-slate-100 text-slate-700',
};

function LiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(startTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h}h ${m}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="text-red-600 font-medium animate-pulse">{elapsed}</span>;
}

export default function DowntimePage() {
  const [records, setRecords] = useState<DowntimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    const res = await fetch('/api/production/downtime');
    const data = await res.json();
    setRecords(data.records || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const openCount = records.filter((r) => !r.endTime).length;
  const resolvedCount = records.filter((r) => r.endTime).length;

  const handleResolve = async () => {
    if (!resolveId || !resolution.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/production/downtime/${resolveId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
      if (res.ok) {
        setResolveId(null);
        setResolution('');
        fetchRecords();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Sự cố máy</h1>
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sự cố máy</h1>
        <div className="flex gap-2 text-sm">
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Đang mở: {openCount}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" /> Đã giải: {resolvedCount}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {records.map((record) => (
          <Card key={record.id} className={!record.endTime ? 'border-red-200' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge className={TYPE_COLORS[record.type] || 'bg-slate-100'}>
                    {record.type}
                  </Badge>
                  {record.workCenter?.name || record.workCenterId}
                </CardTitle>
                {!record.endTime ? (
                  <LiveTimer startTime={record.startTime} />
                ) : (
                  <span className="text-sm text-muted-foreground">{record.durationMinutes}m</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{record.reason}</p>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  Báo bởi: {record.reportedBy || '—'} ·{' '}
                  {new Date(record.startTime).toLocaleString('vi-VN')}
                </span>
                {!record.endTime ? (
                  <Button size="sm" variant="outline" onClick={() => setResolveId(record.id)}>
                    Đã giải quyết
                  </Button>
                ) : (
                  <span className="text-emerald-600">
                    Giải quyết: {record.resolvedBy} — {record.resolution}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {records.length === 0 && (
          <p className="text-muted-foreground text-center py-8">Không có sự cố nào.</p>
        )}
      </div>

      <Dialog open={!!resolveId} onOpenChange={(open) => !open && setResolveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giải quyết sự cố</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Mô tả cách giải quyết..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveId(null)}>
              Huỷ
            </Button>
            <Button onClick={handleResolve} disabled={!resolution.trim() || submitting}>
              {submitting ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
