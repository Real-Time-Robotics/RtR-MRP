"use client";

import { useState } from "react";
import { BarChart3, Loader2, TrendingUp, Package, Factory, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReportType = "inventory_valuation" | "production_performance" | "sales_analytics" | "inventory_turnover";

interface ReportConfig {
  type: ReportType;
  label: string;
  labelVi: string;
  icon: React.ReactNode;
  description: string;
  needsDates: boolean;
}

const reportTypes: ReportConfig[] = [
  { type: "inventory_valuation", label: "Inventory Valuation", labelVi: "Giá trị tồn kho", icon: <Package className="h-4 w-4" />, description: "Tổng giá trị tồn kho theo kho, danh mục, ABC", needsDates: false },
  { type: "production_performance", label: "Production Performance", labelVi: "Hiệu suất sản xuất", icon: <Factory className="h-4 w-4" />, description: "Tỷ lệ hoàn thành WO, đúng hạn, phế phẩm", needsDates: true },
  { type: "sales_analytics", label: "Sales Analytics", labelVi: "Phân tích bán hàng", icon: <ShoppingCart className="h-4 w-4" />, description: "Doanh thu theo KH, SP, tháng", needsDates: true },
  { type: "inventory_turnover", label: "Inventory Turnover", labelVi: "Vòng quay tồn kho", icon: <TrendingUp className="h-4 w-4" />, description: "Tỷ lệ vòng quay & ngày cung ứng", needsDates: true },
];

export default function EnhancedReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>("inventory_valuation");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = reportTypes.find((r) => r.type === selectedType)!;

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: selectedType, fromDate, toDate }),
      });
      if (res.ok) {
        const d = await res.json();
        setReportData(d);
      }
    } finally { setLoading(false); }
  };

  const renderValue = (val: unknown): string => {
    if (val === null || val === undefined) return "-";
    if (typeof val === "number") return val.toLocaleString("vi");
    return String(val);
  };

  const renderSummaryCards = (data: Record<string, unknown>) => {
    const summaryKeys = Object.entries(data).filter(([, v]) => typeof v === "number" || typeof v === "string");
    if (summaryKeys.length === 0) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {summaryKeys.slice(0, 8).map(([key, val]) => (
          <Card key={key} className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold font-mono">{renderValue(val)}</div>
              <div className="text-[10px] uppercase font-mono text-gray-500">{key.replace(/([A-Z])/g, " $1").trim()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderTable = (items: Record<string, unknown>[], title: string) => {
    if (!items || items.length === 0) return null;
    const keys = Object.keys(items[0]);
    return (
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider">{title} ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gunmetal">
                <tr className="border-b border-gray-200 dark:border-mrp-border">
                  {keys.map((k) => <th key={k} className="text-left py-1.5 px-2 font-mono uppercase">{k.replace(/([A-Z])/g, " $1").trim()}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal">
                    {keys.map((k) => <td key={k} className="py-1.5 px-2 font-mono">{renderValue(item[k])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderReportData = () => {
    if (!reportData) return null;
    const sections: React.ReactNode[] = [];

    // Render top-level number/string fields as summary cards
    const scalarData = Object.fromEntries(Object.entries(reportData).filter(([, v]) => typeof v === "number" || typeof v === "string"));
    if (Object.keys(scalarData).length > 0) sections.push(<div key="summary">{renderSummaryCards(scalarData)}</div>);

    // Render arrays as tables
    Object.entries(reportData).forEach(([key, val]) => {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
        sections.push(<div key={key}>{renderTable(val as Record<string, unknown>[], key)}</div>);
      }
    });

    return <div className="space-y-3">{sections}</div>;
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">Enhanced Reports</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Báo cáo nâng cao — tồn kho, sản xuất, bán hàng, vòng quay</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {reportTypes.map((rt) => (
          <button
            key={rt.type}
            onClick={() => { setSelectedType(rt.type); setReportData(null); }}
            className={`p-3 border text-left transition-all ${selectedType === rt.type ? "border-info-cyan bg-info-cyan/5 dark:bg-info-cyan/10" : "border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal"}`}
          >
            <div className={`mb-1 ${selectedType === rt.type ? "text-info-cyan" : "text-gray-400"}`}>{rt.icon}</div>
            <div className="text-[11px] font-mono font-bold">{rt.labelVi}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{rt.description}</div>
          </button>
        ))}
      </div>

      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            {selected.needsDates && (
              <>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Từ ngày</label>
                  <input type="date" className="h-7 px-2 text-[11px] font-mono border border-gray-300 dark:border-mrp-border dark:bg-gunmetal" aria-label="Từ ngày" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Đến ngày</label>
                  <input type="date" className="h-7 px-2 text-[11px] font-mono border border-gray-300 dark:border-mrp-border dark:bg-gunmetal" aria-label="Đến ngày" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}
            <Button size="sm" variant="outline" className="text-[10px]" disabled={loading} onClick={generateReport}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5 mr-1" />}
              Tạo báo cáo
            </Button>
          </div>
        </CardContent>
      </Card>

      {renderReportData()}
    </div>
  );
}
