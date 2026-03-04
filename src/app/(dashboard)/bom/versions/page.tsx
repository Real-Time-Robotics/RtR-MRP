"use client";

import { useState } from "react";
import { Layers, Loader2, CheckCircle2, XCircle, Send, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BomVersion {
  id: string;
  version: number;
  status: string;
  effectiveDate: string | null;
  expiryDate: string | null;
  totalCost: number;
  lineCount: number;
  createdAt: string;
  notes: string | null;
}

export default function BomVersionsPage() {
  const [productId, setProductId] = useState("");
  const [versions, setVersions] = useState<BomVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchVersions = async () => {
    if (!productId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bom/versions?productId=${productId}`);
      const d = await res.json();
      setVersions(d.data || []);
    } finally { setLoading(false); }
  };

  const bomAction = async (action: string, bomId: string, extra?: Record<string, unknown>) => {
    setActionLoading(bomId);
    try {
      const res = await fetch("/api/bom/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, bomId, ...extra }),
      });
      if (res.ok) fetchVersions();
    } finally { setActionLoading(null); }
  };

  const createVersion = async () => {
    if (!productId.trim()) return;
    setActionLoading("new");
    try {
      const res = await fetch("/api/bom/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "new_version", productId }),
      });
      if (res.ok) fetchVersions();
    } finally { setActionLoading(null); }
  };

  const statusConfig: Record<string, { color: string; bg: string }> = {
    active: { color: "text-green-600", bg: "bg-green-50" },
    draft: { color: "text-gray-600", bg: "bg-gray-50" },
    pending_approval: { color: "text-yellow-600", bg: "bg-yellow-50" },
    obsolete: { color: "text-red-600", bg: "bg-red-50" },
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">BOM Versions</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Quản lý phiên bản BOM — phê duyệt & kích hoạt</p>
      </div>

      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 h-7 px-2 text-[11px] font-mono border border-gray-300 dark:border-mrp-border dark:bg-gunmetal"
              placeholder="Nhập Product ID..."
              aria-label="Product ID"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchVersions()}
            />
            <Button size="sm" variant="outline" className="text-[10px]" onClick={fetchVersions} disabled={loading || !productId.trim()}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
              Tìm
            </Button>
            <Button size="sm" variant="outline" className="text-[10px]" onClick={createVersion} disabled={actionLoading === "new" || !productId.trim()}>
              {actionLoading === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Tạo phiên bản mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {versions.length > 0 && (
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Lịch sử phiên bản ({versions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-2">
            <div className="space-y-1.5">
              {versions.map((v) => {
                const cfg = statusConfig[v.status] || statusConfig.draft;
                return (
                  <div key={v.id} className={`flex items-center justify-between p-2.5 border border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal ${v.status === "active" ? "bg-green-50/50 dark:bg-green-950/30" : ""}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-bold">v{v.version}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase ${cfg.color} ${cfg.bg}`}>{v.status.replace("_", " ")}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{v.lineCount} lines</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Cost: {v.totalCost.toLocaleString("vi")}₫
                        {v.effectiveDate && <span className="ml-2">Từ: {new Date(v.effectiveDate).toLocaleDateString("vi")}</span>}
                        {v.notes && <span className="ml-2 italic">{v.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {v.status === "draft" && (
                        <Button size="sm" variant="outline" className="h-6 text-[9px] px-2" disabled={actionLoading === v.id} onClick={() => bomAction("submit", v.id)}>
                          {actionLoading === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Gửi duyệt
                        </Button>
                      )}
                      {v.status === "pending_approval" && (
                        <>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 text-green-600" disabled={actionLoading === v.id} onClick={() => bomAction("approve", v.id, { activateImmediately: true })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Duyệt
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 text-red-600" disabled={actionLoading === v.id} onClick={() => bomAction("reject", v.id, { reason: "Rejected" })}>
                            <XCircle className="h-3 w-3 mr-1" /> Từ chối
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {versions.length === 0 && !loading && productId && (
        <Card className="border-gray-200 dark:border-mrp-border"><CardContent className="p-6 text-center text-gray-400"><Layers className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-[11px]">Không tìm thấy phiên bản BOM cho product này</p></CardContent></Card>
      )}
    </div>
  );
}
