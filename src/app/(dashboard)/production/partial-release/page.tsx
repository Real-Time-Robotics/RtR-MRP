"use client";

import { useState, useEffect } from "react";
import { PlayCircle, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Candidate {
  workOrderId: string;
  woNumber: string;
  woQuantity: number;
  maxProducibleQty: number;
  availabilityPercent: number;
}

export default function PartialReleasePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [released, setReleased] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/manufacturing/partial-release")
      .then((r) => r.json())
      .then((d) => setCandidates(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  const release = async (c: Candidate) => {
    setReleasing(c.workOrderId);
    try {
      const res = await fetch("/api/manufacturing/partial-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId: c.workOrderId, releaseQty: c.maxProducibleQty }),
      });
      if (res.ok) setReleased((prev) => new Set(prev).add(c.workOrderId));
    } finally { setReleasing(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">Partial WO Release</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Giải phóng LSX với vật tư sẵn có — sản xuất một phần</p>
      </div>

      {candidates.length === 0 ? (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950"><CardContent className="p-6 text-center text-green-600"><CheckCircle2 className="h-8 w-8 mx-auto mb-2" /><div className="text-sm font-mono">Tất cả LSX đã đủ vật tư hoặc không có LSX chờ</div></CardContent></Card>
      ) : (
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-500" /> LSX có thể giải phóng một phần ({candidates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-2">
            <div className="space-y-1.5">
              {candidates.map((c) => (
                <div key={c.workOrderId} className={`flex items-center justify-between p-3 border border-gray-200 dark:border-mrp-border ${released.has(c.workOrderId) ? "bg-green-50 dark:bg-green-950" : "hover:bg-gray-50 dark:hover:bg-gunmetal"}`}>
                  <div>
                    <div className="text-[11px] font-mono font-bold">{c.woNumber}</div>
                    <div className="text-[10px] text-gray-500">Yêu cầu: {c.woQuantity} • Có thể SX: {c.maxProducibleQty}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-sm font-mono font-bold ${c.availabilityPercent >= 80 ? "text-green-600" : c.availabilityPercent >= 50 ? "text-yellow-600" : "text-red-600"}`}>{c.availabilityPercent.toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-400">vật tư sẵn có</div>
                    </div>
                    {released.has(c.workOrderId) ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Button size="sm" variant="outline" className="text-[10px]" disabled={releasing === c.workOrderId} onClick={() => release(c)}>
                        {releasing === c.workOrderId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 mr-1" />}
                        Release {c.maxProducibleQty}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
