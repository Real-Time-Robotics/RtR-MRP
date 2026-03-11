"use client";

import { useState, useEffect } from "react";
import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import Link from "next/link";
import {
  DollarSign,
  Calculator,
  FileText,
  BookOpen,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Receipt,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { clientLogger } from '@/lib/client-logger';

interface FinanceStats {
  totalAR: number;
  totalAP: number;
  arOverdue: number;
  apOverdue: number;
  pendingSalesInvoices: number;
  pendingPurchaseInvoices: number;
  mtdRevenue: number;
  mtdExpenses: number;
  grossMargin: number;
}

export default function FinanceDashboardPage() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch AR and AP aging data in parallel
      const [arRes, apRes] = await Promise.all([
        fetch("/api/finance/invoices/sales?action=aging"),
        fetch("/api/finance/invoices/purchase?action=aging"),
      ]);

      let arData = { summary: { total: 0, days90Plus: 0 } };
      let apData = { summary: { total: 0, days90Plus: 0 } };

      if (arRes.ok) arData = await arRes.json();
      if (apRes.ok) apData = await apRes.json();

      setStats({
        totalAR: arData.summary?.total || 0,
        totalAP: apData.summary?.total || 0,
        arOverdue: arData.summary?.days90Plus || 0,
        apOverdue: apData.summary?.days90Plus || 0,
        pendingSalesInvoices: 0,
        pendingPurchaseInvoices: 0,
        mtdRevenue: 0,
        mtdExpenses: 0,
        grossMargin: 0,
      });
    } catch (error) {
      clientLogger.error("Failed to fetch finance data:", error);
      setStats({
        totalAR: 0,
        totalAP: 0,
        arOverdue: 0,
        apOverdue: 0,
        pendingSalesInvoices: 0,
        pendingPurchaseInvoices: 0,
        mtdRevenue: 0,
        mtdExpenses: 0,
        grossMargin: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
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
        title="Financial Management"
        description="Costing, Invoicing, General Ledger & Reports"
      />

      {/* Summary Stats - compact inline */}
      <CompactStatsBar stats={[
        { label: 'Accounts Receivable', value: formatCurrency(stats?.totalAR || 0), color: 'text-success-600' },
        { label: 'Accounts Payable', value: formatCurrency(stats?.totalAP || 0), color: 'text-danger-600' },
        { label: 'Net Position', value: formatCurrency((stats?.totalAR || 0) - (stats?.totalAP || 0)) },
        { label: 'Gross Margin', value: `${(stats?.grossMargin || 0).toFixed(1)}%`, color: 'text-purple-600' },
      ]} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/finance/invoicing?tab=sales&new=true">
                <Receipt className="h-4 w-4 mr-2" />
                New Sales Invoice
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/invoicing?tab=purchase&new=true">
                <FileText className="h-4 w-4 mr-2" />
                New Purchase Invoice
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/gl?new=true">
                <BookOpen className="h-4 w-4 mr-2" />
                New Journal Entry
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/costing?action=rollup">
                <Calculator className="h-4 w-4 mr-2" />
                Run Cost Rollup
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/reports">
                <BarChart3 className="h-4 w-4 mr-2" />
                Financial Reports
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module Links */}
      <div className="grid grid-cols-2 gap-6">
        {/* Costing & Variance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Costing & Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link
                href="/finance/costing"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium">Standard Costing</p>
                    <p className="text-sm text-muted-foreground">
                      BOM cost rollup & analysis
                    </p>
                  </div>
                </div>
                <Badge variant="outline">View</Badge>
              </Link>

              <Link
                href="/finance/costing?tab=variance"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Variance Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      Standard vs Actual costs
                    </p>
                  </div>
                </div>
                <Badge variant="outline">View</Badge>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Invoicing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoicing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link
                href="/finance/invoicing?tab=sales"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success-100 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-success-600" />
                  </div>
                  <div>
                    <p className="font-medium">Sales Invoices (AR)</p>
                    <p className="text-sm text-muted-foreground">
                      Customer billing & payments
                    </p>
                  </div>
                </div>
                <Badge className="bg-success-100 text-success-800">
                  {formatCurrency(stats?.totalAR || 0)}
                </Badge>
              </Link>

              <Link
                href="/finance/invoicing?tab=purchase"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-danger-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-danger-600" />
                  </div>
                  <div>
                    <p className="font-medium">Purchase Invoices (AP)</p>
                    <p className="text-sm text-muted-foreground">
                      Supplier bills & payments
                    </p>
                  </div>
                </div>
                <Badge className="bg-danger-100 text-danger-800">
                  {formatCurrency(stats?.totalAP || 0)}
                </Badge>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* General Ledger */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              General Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link
                href="/finance/gl?tab=accounts"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning-100 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-warning-600" />
                  </div>
                  <div>
                    <p className="font-medium">Chart of Accounts</p>
                    <p className="text-sm text-muted-foreground">
                      GL account structure
                    </p>
                  </div>
                </div>
                <Badge variant="outline">View</Badge>
              </Link>

              <Link
                href="/finance/gl?tab=journals"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium">Journal Entries</p>
                    <p className="text-sm text-muted-foreground">
                      Transactions & postings
                    </p>
                  </div>
                </div>
                <Badge variant="outline">View</Badge>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Financial Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link
                href="/finance/reports?report=trial-balance"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-medium">Trial Balance</p>
                    <p className="text-sm text-muted-foreground">
                      Account balances summary
                    </p>
                  </div>
                </div>
                <Badge variant="outline">View</Badge>
              </Link>

              <Link
                href="/finance/reports?report=margin-analysis"
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-success-600" />
                  </div>
                  <div>
                    <p className="font-medium">Margin Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      Revenue vs cost profitability
                    </p>
                  </div>
                </div>
                <Badge variant="outline">View</Badge>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
