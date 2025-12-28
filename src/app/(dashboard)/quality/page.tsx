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
        const inspectionsData = await inspectionsRes.json();
        setPendingInspections(inspectionsData.slice(0, 10));
      }
    } catch (error) {
      console.error("Failed to fetch quality data:", error);
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
    <div className="space-y-6">
      <PageHeader
        title={t("quality.title")}
        description={t("quality.description")}
      />

      {/* Stats Cards */}
      <QualityDashboardCards
        firstPassYield={stats?.firstPassYield || 100}
        pendingInspections={stats?.totalPending || 0}
        openNCRs={stats?.openNCRs || 0}
        openCAPAs={stats?.openCAPAs || 0}
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("quality.quickActions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/quality/receiving/new">
                <Download className="h-4 w-4 mr-2" />
                {t("quality.newReceivingInspection")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/quality/in-process">
                <Cog className="h-4 w-4 mr-2" />
                {t("quality.newInProcessInspection")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/quality/final">
                <CheckSquare className="h-4 w-4 mr-2" />
                {t("quality.newFinalInspection")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/quality/ncr/new">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {t("quality.createNCR")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/quality/traceability">
                <Search className="h-4 w-4 mr-2" />
                {t("quality.lotLookup")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/quality/certificates">
                <FileText className="h-4 w-4 mr-2" />
                {t("quality.generateCoC")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Pending Inspections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {t("quality.pendingInspections")}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/quality/receiving">{t("quality.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingInspections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("quality.noPendingInspections")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInspections.map((inspection) => (
                  <Link
                    key={inspection.id}
                    href={`/quality/${inspection.type.toLowerCase().replace("_", "-")}/${inspection.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <InspectionTypeBadge type={inspection.type} />
                        <span className="font-medium">
                          {inspection.inspectionNumber}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
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

        {/* Inspection Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("quality.inspectionSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link
                href="/quality/receiving"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Download className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t("quality.receivingInspection")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("quality.incomingMaterialQuality")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stats?.pendingReceiving || 0}</p>
                  <p className="text-xs text-muted-foreground">{t("quality.pending")}</p>
                </div>
              </Link>

              <Link
                href="/quality/in-process"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Cog className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t("quality.inProcessInspection")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("quality.productionQualityChecks")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stats?.pendingInProcess || 0}</p>
                  <p className="text-xs text-muted-foreground">{t("quality.pending")}</p>
                </div>
              </Link>

              <Link
                href="/quality/final"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t("quality.finalInspection")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("quality.finishedGoodsVerification")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stats?.pendingFinal || 0}</p>
                  <p className="text-xs text-muted-foreground">{t("quality.pending")}</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NCR & CAPA Summary */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              {t("quality.ncrReports")}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/quality/ncr">{t("quality.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-amber-600">
                {stats?.openNCRs || 0}
              </p>
              <p className="text-sm text-muted-foreground">{t("quality.openNCRs")}</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/quality/ncr/new">{t("quality.createNCR")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-600" />
              {t("quality.correctiveActions")}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/quality/capa">{t("quality.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-purple-600">
                {stats?.openCAPAs || 0}
              </p>
              <p className="text-sm text-muted-foreground">{t("quality.openCAPAs")}</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/quality/capa/new">{t("quality.createCAPA")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
