"use client";

import { useState, useEffect } from "react";
import { ClipboardList, CheckCircle, Loader2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CycleCountItem {
  inventoryId: string;
  partNumber: string;
  partName: string;
  warehouseCode: string;
  lotNumber: string | null;
  systemQty: number;
  abcClass: string | null;
  lastCountDate: string | null;
  daysSinceLastCount: number | null;
}

export default function CycleCountPage() {
  const [items, setItems] = useState<CycleCountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [countInputs, setCountInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/inventory/cycle-count")
      .then((r) => r.json())
      .then((d) => setItems(d.data || []))
      .finally(() => setLoading(false));
  }, []);

  const submitCount = async (inventoryId: string) => {
    const countedQty = parseInt(countInputs[inventoryId] || "0");
    setSubmitting(inventoryId);
    try {
      const res = await fetch("/api/inventory/cycle-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId, countedQty }),
      });
      if (res.ok) {
        setCompleted((prev) => new Set(prev).add(inventoryId));
      }
    } finally { setSubmitting(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const classColors: Record<string, string> = { A: "text-red-600 bg-red-50", B: "text-yellow-600 bg-yellow-50", C: "text-green-600 bg-green-50" };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">Cycle Count</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Kiểm kê theo ABC — ưu tiên hàng quá hạn đếm</p>
      </div>

      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Danh sách kiểm kê ({items.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gunmetal">
                <tr className="border-b border-gray-200 dark:border-mrp-border">
                  <th className="text-left py-1.5 px-2 font-mono uppercase">Part#</th>
                  <th className="text-left py-1.5 px-2 font-mono uppercase">Tên</th>
                  <th className="text-center py-1.5 px-2 font-mono uppercase">ABC</th>
                  <th className="text-center py-1.5 px-2 font-mono uppercase">Kho</th>
                  <th className="text-right py-1.5 px-2 font-mono uppercase">Hệ thống</th>
                  <th className="text-center py-1.5 px-2 font-mono uppercase">Ngày đếm cuối</th>
                  <th className="text-center py-1.5 px-2 font-mono uppercase w-32">Số lượng đếm</th>
                  <th className="text-center py-1.5 px-2 font-mono uppercase w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.inventoryId} className={`border-b border-gray-100 dark:border-mrp-border ${completed.has(item.inventoryId) ? "bg-green-50 dark:bg-green-950 opacity-60" : "hover:bg-gray-50 dark:hover:bg-gunmetal"}`}>
                    <td className="py-1.5 px-2 font-mono">{item.partNumber}</td>
                    <td className="py-1.5 px-2">{item.partName}</td>
                    <td className="py-1.5 px-2 text-center"><span className={`px-1.5 py-0.5 text-[10px] font-bold font-mono ${classColors[item.abcClass || "C"] || ""}`}>{item.abcClass || "-"}</span></td>
                    <td className="py-1.5 px-2 text-center font-mono">{item.warehouseCode}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold">{item.systemQty}</td>
                    <td className="py-1.5 px-2 text-center text-gray-500">{item.daysSinceLastCount !== null ? `${item.daysSinceLastCount}d trước` : "Chưa đếm"}</td>
                    <td className="py-1.5 px-2 text-center">
                      {!completed.has(item.inventoryId) && (
                        <input type="number" className="w-full h-6 px-1.5 text-[11px] font-mono border border-gray-300 dark:border-mrp-border dark:bg-gunmetal text-center" placeholder="Qty" aria-label="Số lượng kiểm đếm" value={countInputs[item.inventoryId] || ""} onChange={(e) => setCountInputs((prev) => ({ ...prev, [item.inventoryId]: e.target.value }))} />
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {completed.has(item.inventoryId) ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" disabled={!countInputs[item.inventoryId] || submitting === item.inventoryId} onClick={() => submitCount(item.inventoryId)}>
                          {submitting === item.inventoryId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Hash className="h-3 w-3" />}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
