"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, XCircle, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExpiryAlert {
  inventoryId: string;
  partNumber: string;
  partName: string;
  warehouseCode: string;
  lotNumber: string | null;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: "expired" | "critical" | "warning";
}

interface AlertSummary {
  expired: ExpiryAlert[];
  critical: ExpiryAlert[];
  warning: ExpiryAlert[];
  totalExpiredQty: number;
  totalAtRiskQty: number;
}

export default function ExpiryAlertsPage() {
  const [data, setData] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory/expiry-alerts")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const severityConfig = {
    expired: {
      icon: XCircle,
      iconColor: "text-urgent-red",
      iconBg: "bg-urgent-red-dim",
      borderColor: "border-urgent-red/40",
      label: "ĐÃ HẾT HẠN",
      dotColor: "bg-urgent-red",
      dotPulse: true,
      daysColor: "text-urgent-red",
    },
    critical: {
      icon: AlertTriangle,
      iconColor: "text-alert-amber",
      iconBg: "bg-alert-amber-dim",
      borderColor: "border-alert-amber/40",
      label: "NGUY CẤP (≤7 ngày)",
      dotColor: "bg-alert-amber",
      dotPulse: false,
      daysColor: "text-alert-amber",
    },
    warning: {
      icon: Clock,
      iconColor: "text-yellow-600 dark:text-yellow-400",
      iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
      borderColor: "border-yellow-300 dark:border-yellow-600/30",
      label: "CẢNH BÁO (≤30 ngày)",
      dotColor: "bg-yellow-500",
      dotPulse: false,
      daysColor: "text-yellow-600 dark:text-yellow-400",
    },
  };

  const renderAlertGroup = (alerts: ExpiryAlert[], severity: "expired" | "critical" | "warning") => {
    const cfg = severityConfig[severity];
    const Icon = cfg.icon;
    if (alerts.length === 0) return null;

    return (
      <Card key={severity} className={`border ${cfg.borderColor}`}>
        <CardHeader className="px-3 py-2">
          <CardTitle className={`text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5 ${cfg.iconColor}`}>
            <div className={`w-5 h-5 flex items-center justify-center ${cfg.iconBg}`}>
              <Icon className="h-3 w-3" />
            </div>
            {cfg.label} ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          <div className="space-y-1">
            {alerts.map((a) => (
              <div key={a.inventoryId} className="flex items-center justify-between p-2.5 bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal-light transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor} ${cfg.dotPulse ? "animate-pulse" : ""}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-gray-900 dark:text-mrp-text-primary">{a.partNumber}</span>
                      <span className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{a.partName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-gray-400 dark:text-mrp-text-muted">{a.warehouseCode}</span>
                      {a.lotNumber && <span className="text-[10px] font-mono text-gray-400 dark:text-mrp-text-muted">Lot: {a.lotNumber}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono font-bold text-gray-900 dark:text-mrp-text-primary">{a.quantity.toLocaleString("vi")} pcs</div>
                  <div className={`text-[10px] font-mono font-medium ${cfg.daysColor}`}>
                    {a.daysUntilExpiry < 0 ? `${Math.abs(a.daysUntilExpiry)}d quá hạn` : `${a.daysUntilExpiry}d còn lại`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const totalExpired = data?.totalExpiredQty || 0;
  const totalAtRisk = data?.totalAtRiskQty || 0;
  const totalWarning = data?.warning.length || 0;
  const hasAlerts = data && (data.expired.length > 0 || data.critical.length > 0 || data.warning.length > 0);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">Expiry Alerts</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">Cảnh báo hàng sắp hết hạn & đã hết hạn</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Expired */}
        <div className={`bg-white dark:bg-gunmetal border p-3 ${totalExpired > 0 ? "border-urgent-red/50" : "border-gray-200 dark:border-mrp-border"}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-mrp-text-secondary">SL Hết hạn</p>
              <p className={`text-xl font-semibold font-mono tabular-nums leading-none ${totalExpired > 0 ? "text-urgent-red" : "text-gray-900 dark:text-mrp-text-primary"}`}>{totalExpired}</p>
            </div>
            <div className={`w-8 h-8 flex items-center justify-center ${totalExpired > 0 ? "bg-urgent-red-dim text-urgent-red" : "bg-gray-100 dark:bg-gunmetal-light text-gray-400 dark:text-mrp-text-muted"}`}>
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
        {/* Critical */}
        <div className={`bg-white dark:bg-gunmetal border p-3 ${totalAtRisk > 0 ? "border-alert-amber/50" : "border-gray-200 dark:border-mrp-border"}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-mrp-text-secondary">SL Nguy cấp</p>
              <p className={`text-xl font-semibold font-mono tabular-nums leading-none ${totalAtRisk > 0 ? "text-alert-amber" : "text-gray-900 dark:text-mrp-text-primary"}`}>{totalAtRisk}</p>
            </div>
            <div className={`w-8 h-8 flex items-center justify-center ${totalAtRisk > 0 ? "bg-alert-amber-dim text-alert-amber" : "bg-gray-100 dark:bg-gunmetal-light text-gray-400 dark:text-mrp-text-muted"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>
        {/* Warning */}
        <div className={`bg-white dark:bg-gunmetal border p-3 ${totalWarning > 0 ? "border-yellow-300 dark:border-yellow-600/30" : "border-gray-200 dark:border-mrp-border"}`}>
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-mrp-text-secondary">Cảnh báo</p>
              <p className={`text-xl font-semibold font-mono tabular-nums leading-none ${totalWarning > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-gray-900 dark:text-mrp-text-primary"}`}>{totalWarning}</p>
            </div>
            <div className={`w-8 h-8 flex items-center justify-center ${totalWarning > 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" : "bg-gray-100 dark:bg-gunmetal-light text-gray-400 dark:text-mrp-text-muted"}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Groups */}
      <div className="space-y-2">
        {data && renderAlertGroup(data.expired, "expired")}
        {data && renderAlertGroup(data.critical, "critical")}
        {data && renderAlertGroup(data.warning, "warning")}
        {!hasAlerts && (
          <Card className="border-production-green/30">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-production-green" />
              <div className="text-sm font-mono text-production-green">Không có cảnh báo hết hạn</div>
              <div className="text-[10px] text-gray-500 dark:text-mrp-text-muted mt-1">Tất cả hàng tồn kho đều trong hạn sử dụng</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
