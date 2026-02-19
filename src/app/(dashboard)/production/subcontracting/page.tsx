"use client";

import { useState, useEffect } from "react";
import { Truck, Loader2, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PendingShipment {
  shipmentRef: string;
  supplierName: string;
  partNumber: string;
  quantity: number;
  sentDate: string;
  expectedReturn: string | null;
}

interface SubSummary {
  totalPendingShipments: number;
  totalPendingQty: number;
  overdueReturns: number;
}

export default function SubcontractingPage() {
  const [shipments, setShipments] = useState<PendingShipment[]>([]);
  const [summary, setSummary] = useState<SubSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manufacturing/subcontracting")
      .then((r) => r.json())
      .then((d) => { setShipments(d.data || []); setSummary(d.summary || null); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">Subcontracting</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Quản lý gia công ngoài — gửi đi & nhận về</p>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-gray-200 dark:border-mrp-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold font-mono">{summary.totalPendingShipments}</div><div className="text-[10px] uppercase font-mono text-gray-500">Đang gửi</div></CardContent></Card>
          <Card className="border-gray-200 dark:border-mrp-border"><CardContent className="p-3 text-center"><div className="text-2xl font-bold font-mono">{summary.totalPendingQty}</div><div className="text-[10px] uppercase font-mono text-gray-500">Tổng SL</div></CardContent></Card>
          <Card className={`border ${summary.overdueReturns > 0 ? "border-red-200 bg-red-50 dark:bg-red-950" : "border-gray-200 dark:border-mrp-border"}`}><CardContent className="p-3 text-center"><div className={`text-2xl font-bold font-mono ${summary.overdueReturns > 0 ? "text-red-600" : ""}`}>{summary.overdueReturns}</div><div className="text-[10px] uppercase font-mono text-gray-500">Quá hạn</div></CardContent></Card>
        </div>
      )}

      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Đang gia công ({shipments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          {shipments.length === 0 ? (
            <div className="text-center py-6 text-gray-400"><Truck className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-[11px]">Không có hàng đang gia công ngoài</p></div>
          ) : (
            <table className="w-full text-[11px]">
              <thead><tr className="border-b border-gray-200 dark:border-mrp-border"><th className="text-left py-1.5 px-2 font-mono uppercase">Mã gửi</th><th className="text-left py-1.5 px-2 font-mono uppercase">NCC</th><th className="text-left py-1.5 px-2 font-mono uppercase">Part#</th><th className="text-right py-1.5 px-2 font-mono uppercase">SL</th><th className="text-center py-1.5 px-2 font-mono uppercase">Ngày gửi</th><th className="text-center py-1.5 px-2 font-mono uppercase">Hạn trả</th></tr></thead>
              <tbody>
                {shipments.map((s, i) => {
                  const isOverdue = s.expectedReturn && new Date(s.expectedReturn) < new Date();
                  return (
                    <tr key={i} className={`border-b border-gray-100 dark:border-mrp-border ${isOverdue ? "bg-red-50 dark:bg-red-950" : "hover:bg-gray-50 dark:hover:bg-gunmetal"}`}>
                      <td className="py-1.5 px-2 font-mono">{s.shipmentRef}</td>
                      <td className="py-1.5 px-2">{s.supplierName}</td>
                      <td className="py-1.5 px-2 font-mono">{s.partNumber}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">{s.quantity}</td>
                      <td className="py-1.5 px-2 text-center">{new Date(s.sentDate).toLocaleDateString("vi")}</td>
                      <td className="py-1.5 px-2 text-center">{s.expectedReturn ? <span className={isOverdue ? "text-red-600 font-bold" : ""}>{isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}{s.expectedReturn}</span> : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
