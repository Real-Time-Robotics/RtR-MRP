"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Download,
  Cog,
  CheckSquare,
  Search,
  FileText,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { QualityDashboardCards } from "@/components/quality/quality-dashboard-cards";
import { PassFailBadge } from "@/components/quality/pass-fail-badge";
import { InspectionTypeBadge } from "@/components/quality/inspection-type-badge";
import { useLanguage } from "@/lib/i18n/language-context";
import { clientLogger } from '@/lib/client-logger';

interface QualityStats {
  pendingReceiving: number;
  pendingInProcess: number;
  pendingFinal: number;
  totalPending: number;
  openNCRs: number;
  openCAPAs: number;
  firstPassYield: number;
}

interface Inspection {
  id: string;
  inspectionNumber: string;
  type: string;
  status: string;
  result: string | null;
  lotNumber: string | null;
  part?: { partNumber: string; name: string } | null;
  product?: { sku: string; name: string } | null;
  createdAt: string;
}

export default function QualityDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [pendingInspections, setPendingInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, inspectionsRes] = await Promise.all([
        fetch("/api/quality"),
        fetch("/api/quality/inspections?status=pending"),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (inspectionsRes.ok) {
        const result = await inspectionsRes.json();
        // API returns { data: [...], pagination: {...} }
        const inspectionsData = Array.isArray(result) ? result : (result.data || []);
        setPendingInspections(inspectionsData.slice(0, 10));
      }
    } catch (error) {
      clientLogger.error("Failed to fetch quality data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    // COMPACT: space-y-6 → space-y-3
    <div className="space-y-3">
      {/* COMPACT: Custom header instead of PageHeader */}
      <div>
        <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary">{t("quality.title")}</h1>
        <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">{t("quality.description")}</p>
      </div>

      {/* Stats Cards */}
      <QualityDashboardCards
        firstPassYield={stats?.firstPassYield || 100}
        pendingInspections={stats?.totalPending || 0}
        openNCRs={stats?.openNCRs || 0}
        openCAPAs={stats?.openCAPAs || 0}
      />

      {/* Quick Actions - COMPACT */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="px-3 py-2">
          <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider">{t("quality.quickActions")}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-2">
          {/* COMPACT: gap-3 → gap-1.5, smaller buttons */}
          <div className="flex flex-wrap gap-1.5">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/receiving/new">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {t("quality.newReceivingInspection")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/in-process">
                <Cog className="h-3.5 w-3.5 mr-1.5" />
                {t("quality.newInProcessInspection")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/final">
                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                {t("quality.newFinalInspection")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/ncr/new">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                {t("quality.createNCR")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/traceability">
                <Search className="h-3.5 w-3.5 mr-1.5" />
                {t("quality.lotLookup")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/quality/certificates">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                {t("quality.generateCoC")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* COMPACT: gap-6 → gap-2 */}
      <div className="grid grid-cols-2 gap-2">
        {/* Pending Inspections - COMPACT */}
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              {t("quality.pendingInspections")}
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-6 text-[10px]">
              <Link href="/quality/receiving">{t("quality.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-3 py-2">
            {pendingInspections.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-[11px]">{t("quality.noPendingInspections")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingInspections.map((inspection) => (
                  <Link
                    key={inspection.id}
                    href={`/quality/${inspection.type.toLowerCase().replace("_", "-")}/${inspection.id}`}
                    className="flex items-center justify-between p-2 border border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <InspectionTypeBadge type={inspection.type} />
                        <span className="text-[11px] font-medium">
                          {inspection.inspectionNumber}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {inspection.part?.partNumber || inspection.product?.sku}
                        {inspection.lotNumber && ` • Lot: ${inspection.lotNumber}`}
                      </p>
                    </div>
                    <PassFailBadge result={inspection.result as "PASS" | "FAIL" | "CONDITIONAL" | "PENDING" | null} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspection Breakdown - COMPACT */}
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("quality.inspectionSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-2">
            <div className="space-y-1.5">
              <Link
                href="/quality/receiving"
                className="flex items-center justify-between p-2 border border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Download className="h-3.5 w-3.5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium">{t("quality.receivingInspection")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("quality.incomingMaterialQuality")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold font-mono">{stats?.pendingReceiving || 0}</p>
                  <p className="text-[9px] text-muted-foreground">{t("quality.pending")}</p>
                </div>
              </Link>

              <Link
                href="/quality/in-process"
                className="flex items-center justify-between p-2 border border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Cog className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium">{t("quality.inProcessInspection")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("quality.productionQualityChecks")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold font-mono">{stats?.pendingInProcess || 0}</p>
                  <p className="text-[9px] text-muted-foreground">{t("quality.pending")}</p>
                </div>
              </Link>

              <Link
                href="/quality/final"
                className="flex items-center justify-between p-2 border border-gray-200 dark:border-mrp-border hover:bg-gray-50 dark:hover:bg-gunmetal transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                    <CheckSquare className="h-3.5 w-3.5 text-success-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium">{t("quality.finalInspection")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("quality.finishedGoodsVerification")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold font-mono">{stats?.pendingFinal || 0}</p>
                  <p className="text-[9px] text-muted-foreground">{t("quality.pending")}</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NCR & CAPA Summary - COMPACT: gap-6 → gap-2 */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning-600" />
              {t("quality.ncrReports")}
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-6 text-[10px]">
              <Link href="/quality/ncr">{t("quality.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-3 py-2">
            <div className="text-center py-2">
              <p className="text-2xl font-semibold font-mono text-warning-600">
                {stats?.openNCRs || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("quality.openNCRs")}</p>
              <Button asChild className="mt-2 text-[11px]" size="sm">
                <Link href="/quality/ncr/new">{t("quality.createNCR")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-mrp-border">
          <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
            <CardTitle className="text-[11px] font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-purple-600" />
              {t("quality.correctiveActions")}
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-6 text-[10px]">
              <Link href="/quality/capa">{t("quality.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-3 py-2">
            <div className="text-center py-2">
              <p className="text-2xl font-semibold font-mono text-purple-600">
                {stats?.openCAPAs || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("quality.openCAPAs")}</p>
              <Button asChild className="mt-2 text-[11px]" size="sm">
                <Link href="/quality/capa/new">{t("quality.createCAPA")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
