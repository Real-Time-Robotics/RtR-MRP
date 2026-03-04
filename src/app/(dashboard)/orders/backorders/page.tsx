"use client";

import { useState, useEffect } from "react";
import { PackageX, Loader2, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BackorderLine {
  salesOrderId: string;
  soNumber: string;
  customerName: string;
  partNumber: string;
  productName: string;
  orderedQty: number;
  shippedQty: number;
  shortQty: number;
  availableStock: number;
  canFulfill: boolean;
}

interface BackorderSummary {
  totalBackorderLines: number;
  totalShortQty: number;
  fulfillableLines: number;
  byCustomer: { customerName: string; lines: number; totalShort: number }[];
}

export default function BackordersPage() {
  const [backorders, setBackorders] = useState<BackorderLine[]>([]);
  const [summary, setSummary] = useState<BackorderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/shipping/backorders")
      .then((r) => r.json())
      .then((d) => { setBackorders(d.data || []); setSummary(d.summary || null); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const processAll = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/shipping/backorders", { method: "POST" });
      if (res.ok) {
        setProcessed(true);
        setTimeout(fetchData, 1500);
      }
    } finally { setProcessing(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">Backorders</h1>
          <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Đơn hàng giao thiếu — tự động tạo lô giao bổ sung</p>
        </div>
        {backorders.some((b) => b.canFulfill) && !processed && (
          <Button size="sm" variant="outline" className="text-[10px]" disabled={processing} onClick={processAll}>
            {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Truck className="h-3.5 w-3.5 mr-1" />}
            Xử lý Backorder
          </Button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-gray-200 dark:border-mrp-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold font-mono">{summary.totalBackorderLines}</div><div className="text-[10px] uppercase font-mono text-gray-500">Dòng thiếu</div></CardContent></Card>
          <Card className="border-gray-200 dark:border-mrp-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold font-mono">{summary.totalShortQty}</div><div className="text-[10px] uppercase font-mono text-gray-500">Tổng SL thiếu</div></CardContent></Card>
          <Card className={`border ${summary.fulfillableLines > 0 ? "border-green-200 bg-green-50 dark:bg-green-950" : "border-gray-200 dark:border-mrp-border"}`}><CardContent className="p-3 text-center"><div className={`text-2xl font-bold font-mono ${summary.fulfillableLines > 0 ? "text-green-600" : ""}`}>{summary.fulfillableLines}</div><div className="text-[10px] uppercase font-mono text-gray-500">Có thể giao</div></CardContent></Card>
        </div>
      )}

      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <PackageX className="h-3.5 w-3.5" /> Backorder Lines ({backorders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          {backorders.length === 0 ? (
            <div className="text-center py-6 text-gray-400"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-400" /><p className="text-[11px]">Không có backorder — tất cả đơn hàng đã giao đủ</p></div>
          ) : (
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-gray-200 dark:border-mrp-border"><th className="text-left py-1.5 px-2 font-mono uppercase">SO#</th><th className="text-left py-1.5 px-2 font-mono uppercase">Khách hàng</th><th className="text-left py-1.5 px-2 font-mono uppercase">Part#</th><th className="text-right py-1.5 px-2 font-mono uppercase">Đặt</th><th className="text-right py-1.5 px-2 font-mono uppercase">Đã giao</th><th className="text-right py-1.5 px-2 font-mono uppercase">Thiếu</th><th className="text-center py-1.5 px-2 font-mono uppercase">Tồn kho</th><th className="text-center py-1.5 px-2 font-mono uppercase">Trạng thái</th></tr></thead>
              <tbody>
                {backorders.map((b, i) => (
                  <tr key={i} className={`border-b border-gray-100 dark:border-mrp-border ${b.canFulfill ? "bg-green-50 dark:bg-green-950" : "hover:bg-gray-50 dark:hover:bg-gunmetal"}`}>
                    <td className="py-1.5 px-2 font-mono">{b.soNumber}</td>
                    <td className="py-1.5 px-2">{b.customerName}</td>
                    <td className="py-1.5 px-2 font-mono">{b.partNumber || b.productName}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{b.orderedQty}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{b.shippedQty}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-red-600">{b.shortQty}</td>
                    <td className="py-1.5 px-2 text-center font-mono">{b.availableStock}</td>
                    <td className="py-1.5 px-2 text-center">
                      {b.canFulfill
                        ? <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono text-green-600 bg-green-50">CÓ HÀNG</span>
                        : <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono text-red-600 bg-red-50">THIẾU HÀNG</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {processed && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950"><CardContent className="p-3 text-center text-green-600"><CheckCircle2 className="h-5 w-5 mx-auto mb-1" /><div className="text-[11px] font-mono">Đã tạo shipment bổ sung cho các backorder có hàng</div></CardContent></Card>
      )}
    </div>
  );
}
