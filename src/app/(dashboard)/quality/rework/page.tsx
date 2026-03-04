"use client";

import { useState, useEffect } from "react";
import { Wrench, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PendingRework {
  ncrId: string;
  ncrNumber: string;
  partNumber: string | null;
  productName: string | null;
  quantityAffected: number;
  originalWONumber: string | null;
  priority: string;
}

export default function ReworkPage() {
  const [pending, setPending] = useState<PendingRework[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [created, setCreated] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetch("/api/quality/rework")
      .then((r) => r.json())
      .then((d) => setPending(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  const createRework = async (ncr: PendingRework) => {
    setCreating(ncr.ncrId);
    try {
      const res = await fetch("/api/quality/rework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ncrId: ncr.ncrId, reworkInstructions: `Rework for NCR ${ncr.ncrNumber}` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setCreated((prev) => new Map(prev).set(ncr.ncrId, data.reworkWONumber));
      }
    } finally { setCreating(null); }
  };

  const priorityColors: Record<string, string> = { critical: "text-red-600 bg-red-50", high: "text-orange-600 bg-orange-50", medium: "text-yellow-600 bg-yellow-50", low: "text-green-600 bg-green-50" };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">Rework Work Orders</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Tạo LSX sửa chữa từ NCR có disposition REWORK</p>
      </div>

      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> NCR chờ tạo Rework WO ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          {pending.length === 0 ? (
            <div className="text-center py-6 text-gray-400"><Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-[11px]">Không có NCR nào chờ rework</p></div>
          ) : (
            <div className="space-y-1.5">
              {pending.map((ncr) => (
                <div key={ncr.ncrId} className="flex items-center justify-between p-2.5 border border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold">{ncr.ncrNumber}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase ${priorityColors[ncr.priority] || ""}`}>{ncr.priority}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {ncr.partNumber || ncr.productName} • {ncr.quantityAffected} pcs
                      {ncr.originalWONumber && <span className="ml-2">WO gốc: {ncr.originalWONumber}</span>}
                    </div>
                  </div>
                  {created.has(ncr.ncrId) ? (
                    <span className="text-[10px] font-mono text-green-600 font-bold">→ {created.get(ncr.ncrId)}</span>
                  ) : (
                    <Button size="sm" variant="outline" className="text-[10px]" disabled={creating === ncr.ncrId} onClick={() => createRework(ncr)}>
                      {creating === ncr.ncrId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                      Tạo Rework WO
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
