"use client";

import { useState, useEffect } from "react";
import { BarChart3, Play, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/language-context";

interface ABCSummary {
  A: number;
  B: number;
  C: number;
  unclassified: number;
  total: number;
}

interface ABCResult {
  partId: string;
  partNumber: string;
  name: string;
  annualUsageValue: number;
  cumulativePercent: number;
  abcClass: "A" | "B" | "C";
}

export default function ABCClassificationPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<ABCSummary | null>(null);
  const [results, setResults] = useState<ABCResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { fetchSummary(); }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/inventory/abc-classification");
      if (res.ok) setSummary(await res.json());
    } finally { setLoading(false); }
  };

  const runClassification = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/inventory/abc-classification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        fetchSummary();
      }
    } finally { setRunning(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const classColors = { A: "text-red-600 bg-red-50 dark:bg-red-950 border-red-200", B: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950 border-yellow-200", C: "text-green-600 bg-green-50 dark:bg-green-950 border-green-200" };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">ABC Classification</h1>
          <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Phân loại ABC theo giá trị sử dụng hàng năm</p>
        </div>
        <Button onClick={runClassification} disabled={running} size="sm" className="text-xs">
          {running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
          {running ? "Đang chạy..." : "Chạy phân loại ABC"}
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-2">
          {(["A", "B", "C"] as const).map((cls) => (
            <Card key={cls} className={`border ${classColors[cls]}`}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold font-mono">{summary[cls]}</div>
                <div className="text-[10px] uppercase tracking-wider font-mono">Class {cls}</div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold font-mono text-gray-400">{summary.unclassified}</div>
              <div className="text-[10px] uppercase tracking-wider font-mono">Chưa phân loại</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 dark:border-mrp-border">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold font-mono">{summary.total}</div>
              <div className="text-[10px] uppercase tracking-wider font-mono">Tổng</div>
            </CardContent>
          </Card>
        </div>
      )}

      {results.length > 0 && (
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Kết quả phân loại ({results.length} parts)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-2">
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gunmetal">
                  <tr className="border-b border-gray-200 dark:border-mrp-border">
                    <th className="text-left py-1.5 px-2 font-mono uppercase">Part#</th>
                    <th className="text-left py-1.5 px-2 font-mono uppercase">Tên</th>
                    <th className="text-right py-1.5 px-2 font-mono uppercase">Giá trị/năm</th>
                    <th className="text-right py-1.5 px-2 font-mono uppercase">% Tích lũy</th>
                    <th className="text-center py-1.5 px-2 font-mono uppercase">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.partId} className="border-b border-gray-100 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal">
                      <td className="py-1.5 px-2 font-mono">{r.partNumber}</td>
                      <td className="py-1.5 px-2">{r.name}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{r.annualUsageValue.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{r.cumulativePercent.toFixed(1)}%</td>
                      <td className="py-1.5 px-2 text-center"><span className={`px-1.5 py-0.5 text-[10px] font-bold font-mono ${classColors[r.abcClass]}`}>{r.abcClass}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
