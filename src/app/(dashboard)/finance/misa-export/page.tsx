"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MISAEntry {
  ngayHachToan: string;
  ngayChungTu: string;
  soChungTu: string;
  dienGiai: string;
  tkNo: string;
  tkCo: string;
  soTien: number;
  doiTuong: string;
  maHang: string;
  dvt: string;
  soLuong: number;
  donGia: number;
}

export default function MISAExportPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [exportType, setExportType] = useState("all");
  const [entries, setEntries] = useState<MISAEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewed, setPreviewed] = useState(false);

  const preview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/misa-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate, type: exportType }),
      });
      if (res.ok) {
        const d = await res.json();
        setEntries(d.entries || []);
        setPreviewed(true);
      }
    } finally { setLoading(false); }
  };

  const downloadCSV = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/misa-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate, type: exportType, format: "csv" }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `MISA_Export_${fromDate}_${toDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally { setLoading(false); }
  };

  const typeLabels: Record<string, string> = { all: "Tất cả", journal: "Sổ cái", purchase: "Mua hàng", sales: "Bán hàng" };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">MISA Export</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Xuất dữ liệu kế toán sang MISA — Thông tư 200/2014/TT-BTC</p>
      </div>

      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Từ ngày</label>
              <input type="date" className="h-7 px-2 text-[11px] font-mono border border-gray-300 rounded bg-white text-gray-900 dark:border-mrp-border dark:bg-gunmetal dark:text-white" aria-label="Từ ngày" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Đến ngày</label>
              <input type="date" className="h-7 px-2 text-[11px] font-mono border border-gray-300 rounded bg-white text-gray-900 dark:border-mrp-border dark:bg-gunmetal dark:text-white" aria-label="Đến ngày" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1">Loại</label>
              <select className="h-7 px-2 text-[11px] font-mono border border-gray-300 rounded bg-white text-gray-900 dark:border-mrp-border dark:bg-gunmetal dark:text-white" aria-label="Loại xuất" value={exportType} onChange={(e) => setExportType(e.target.value)}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Button size="sm" variant="outline" className="text-[10px]" disabled={loading} onClick={preview}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              Xem trước
            </Button>
            <Button size="sm" variant="outline" className="text-[10px]" disabled={loading} onClick={downloadCSV}>
              <Download className="h-3.5 w-3.5 mr-1" /> Tải CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewed && (
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Kết quả ({entries.length} bút toán)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-2">
            {entries.length === 0 ? (
              <div className="text-center py-6 text-gray-400"><FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-[11px]">Không có bút toán trong khoảng thời gian này</p></div>
            ) : (
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gunmetal">
                    <tr className="border-b border-gray-200 dark:border-mrp-border">
                      <th className="text-left py-1.5 px-2 font-mono uppercase">Ngày HT</th>
                      <th className="text-left py-1.5 px-2 font-mono uppercase">Số CT</th>
                      <th className="text-left py-1.5 px-2 font-mono uppercase">Diễn giải</th>
                      <th className="text-center py-1.5 px-2 font-mono uppercase">TK Nợ</th>
                      <th className="text-center py-1.5 px-2 font-mono uppercase">TK Có</th>
                      <th className="text-right py-1.5 px-2 font-mono uppercase">Số tiền</th>
                      <th className="text-left py-1.5 px-2 font-mono uppercase">Đối tượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 100).map((e, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal">
                        <td className="py-1.5 px-2 font-mono">{e.ngayHachToan}</td>
                        <td className="py-1.5 px-2 font-mono">{e.soChungTu}</td>
                        <td className="py-1.5 px-2 max-w-[200px] truncate">{e.dienGiai}</td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold">{e.tkNo}</td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold">{e.tkCo}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{e.soTien.toLocaleString("vi")}₫</td>
                        <td className="py-1.5 px-2">{e.doiTuong}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {entries.length > 100 && <div className="text-center py-2 text-[10px] text-gray-400 font-mono">Hiển thị 100/{entries.length} bút toán — Tải CSV để xem tất cả</div>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
