"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  FileText,
  DollarSign,
  TrendingUp,
  Download,
  Loader2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrialBalance } from "@/components/finance";
import { clientLogger } from '@/lib/client-logger';

type ReportType = "trial-balance" | "income-statement" | "balance-sheet" | "cost-analysis" | "margin-analysis";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  );
}

function FinanceReportsContent() {
  const searchParams = useSearchParams();
  const initialReport = (searchParams.get("report") as ReportType) || "trial-balance";

  const [selectedReport, setSelectedReport] = useState<ReportType>(initialReport);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchReport();
  }, [selectedReport, asOfDate, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `/api/finance/reports?report=${selectedReport}`;

      if (selectedReport === "trial-balance" || selectedReport === "balance-sheet") {
        url += `&asOfDate=${asOfDate}`;
      } else {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReportData(data.data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const reports = [
    { id: "trial-balance", name: "Trial Balance", icon: BarChart3, description: "Account balances summary" },
    { id: "income-statement", name: "Income Statement", icon: TrendingUp, description: "Revenue and expenses" },
    { id: "balance-sheet", name: "Balance Sheet", icon: FileText, description: "Assets, liabilities, equity" },
    { id: "cost-analysis", name: "Cost Analysis", icon: DollarSign, description: "Part cost breakdown" },
    { id: "margin-analysis", name: "Margin Analysis", icon: TrendingUp, description: "Sales profitability" },
  ];

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="text-center text-muted-foreground py-12">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No data available for this report</p>
        </div>
      );
    }

    switch (selectedReport) {
      case "trial-balance":
        const trialBalanceAccounts = ((reportData.accounts as Array<Record<string, unknown>>) || []).map((a) => ({
          accountId: String(a.accountId || ""),
          accountNumber: String(a.accountNumber || ""),
          accountName: String(a.accountName || ""),
          accountType: String(a.accountType || ""),
          debitBalance: Number(a.debitBalance) || 0,
          creditBalance: Number(a.creditBalance) || 0,
        }));
        return (
          <TrialBalance
            asOfDate={asOfDate}
            accounts={trialBalanceAccounts}
            totalDebits={Number(reportData.totalDebits) || 0}
            totalCredits={Number(reportData.totalCredits) || 0}
          />
        );

      case "income-statement":
        const incomeData = reportData as {
          revenue: { items: Array<{ accountNumber: string; accountName: string; amount: number }>; total: number };
          expenses: { items: Array<{ accountNumber: string; accountName: string; amount: number }>; total: number };
          netIncome: number;
        };
        return (
          <Card>
            <CardHeader>
              <CardTitle>Income Statement</CardTitle>
              <p className="text-sm text-muted-foreground">
                {startDate} to {endDate}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Revenue Section */}
              <div>
                <h3 className="font-semibold mb-2">Revenue</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableBody>
                      {(incomeData.revenue?.items || []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{item.accountNumber}</TableCell>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>Total Revenue</TableCell>
                        <TableCell className="text-right text-success-600">
                          {formatCurrency(incomeData.revenue?.total || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Expenses Section */}
              <div>
                <h3 className="font-semibold mb-2">Expenses</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableBody>
                      {(incomeData.expenses?.items || []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{item.accountNumber}</TableCell>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>Total Expenses</TableCell>
                        <TableCell className="text-right text-danger-600">
                          {formatCurrency(incomeData.expenses?.total || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Net Income */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Net Income</span>
                  <span
                    className={`text-2xl font-bold ${
                      (incomeData.netIncome || 0) >= 0 ? "text-success-600" : "text-danger-600"
                    }`}
                  >
                    {formatCurrency(incomeData.netIncome || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "balance-sheet":
        const bsData = reportData as {
          assets: { items: Array<{ accountNumber: string; accountName: string; amount: number }>; total: number };
          liabilities: { items: Array<{ accountNumber: string; accountName: string; amount: number }>; total: number };
          equity: { items: Array<{ accountNumber: string; accountName: string; amount: number }>; total: number };
          totalLiabilitiesAndEquity: number;
        };
        return (
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <p className="text-sm text-muted-foreground">As of {asOfDate}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Assets */}
              <div>
                <h3 className="font-semibold mb-2">Assets</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableBody>
                      {(bsData.assets?.items || []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{item.accountNumber}</TableCell>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>Total Assets</TableCell>
                        <TableCell className="text-right">{formatCurrency(bsData.assets?.total || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Liabilities */}
              <div>
                <h3 className="font-semibold mb-2">Liabilities</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableBody>
                      {(bsData.liabilities?.items || []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{item.accountNumber}</TableCell>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>Total Liabilities</TableCell>
                        <TableCell className="text-right">{formatCurrency(bsData.liabilities?.total || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Equity */}
              <div>
                <h3 className="font-semibold mb-2">Equity</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableBody>
                      {(bsData.equity?.items || []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{item.accountNumber}</TableCell>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>Total Equity</TableCell>
                        <TableCell className="text-right">{formatCurrency(bsData.equity?.total || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total L&E */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total Liabilities & Equity</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(bsData.totalLiabilitiesAndEquity || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "cost-analysis":
        const costData = reportData as {
          summary: {
            totalMaterialCost: number;
            totalLaborCost: number;
            totalOverheadCost: number;
            grandTotal: number;
          };
          items: Array<{
            partNumber: string;
            partName: string;
            materialCost: number;
            laborCost: number;
            overheadCost: number;
            totalCost: number;
          }>;
        };
        return (
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-primary-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Material Cost</p>
                  <p className="text-xl font-bold text-primary-600">
                    {formatCurrency(costData.summary?.totalMaterialCost || 0)}
                  </p>
                </div>
                <div className="p-4 bg-success-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Labor Cost</p>
                  <p className="text-xl font-bold text-success-600">
                    {formatCurrency(costData.summary?.totalLaborCost || 0)}
                  </p>
                </div>
                <div className="p-4 bg-warning-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Overhead Cost</p>
                  <p className="text-xl font-bold text-warning-600">
                    {formatCurrency(costData.summary?.totalOverheadCost || 0)}
                  </p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(costData.summary?.grandTotal || 0)}
                  </p>
                </div>
              </div>

              {/* Detail Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Material</TableHead>
                      <TableHead className="text-right">Labor</TableHead>
                      <TableHead className="text-right">Overhead</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(costData.items || []).slice(0, 20).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{item.partNumber}</TableCell>
                        <TableCell>{item.partName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.materialCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.laborCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.overheadCost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.totalCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      case "margin-analysis":
        const marginData = reportData as {
          totals: { revenue: number; cost: number; margin: number; marginPercent: number };
          invoices: Array<{
            invoiceNumber: string;
            invoiceDate: string;
            customer: { code: string; name: string };
            revenue: number;
            cost: number;
            margin: number;
            marginPercent: number;
          }>;
        };
        return (
          <Card>
            <CardHeader>
              <CardTitle>Margin Analysis Report</CardTitle>
              <p className="text-sm text-muted-foreground">
                {startDate} to {endDate}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-success-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold text-success-600">
                    {formatCurrency(marginData.totals?.revenue || 0)}
                  </p>
                </div>
                <div className="p-4 bg-danger-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-bold text-danger-600">
                    {formatCurrency(marginData.totals?.cost || 0)}
                  </p>
                </div>
                <div className="p-4 bg-primary-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Gross Margin</p>
                  <p className="text-xl font-bold text-primary-600">
                    {formatCurrency(marginData.totals?.margin || 0)}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Margin %</p>
                  <p className="text-xl font-bold text-purple-600">
                    {(marginData.totals?.marginPercent || 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Detail Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(marginData.invoices || []).map((inv, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.customer?.name}</TableCell>
                        <TableCell>{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.cost)}</TableCell>
                        <TableCell
                          className={`text-right ${inv.margin >= 0 ? "text-success-600" : "text-danger-600"}`}
                        >
                          {formatCurrency(inv.margin)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={inv.marginPercent >= 20 ? "default" : "secondary"}
                            className={
                              inv.marginPercent >= 30
                                ? "bg-success-100 text-success-800"
                                : inv.marginPercent >= 20
                                ? "bg-warning-100 text-warning-800"
                                : "bg-danger-100 text-danger-800"
                            }
                          >
                            {inv.marginPercent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Trial Balance, Income Statement, Balance Sheet & Analysis"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-6">
        {/* Report Selection */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Select Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id as ReportType)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  selectedReport === report.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <report.icon className="h-5 w-5" />
                <div>
                  <p className="font-medium text-sm">{report.name}</p>
                  <p
                    className={`text-xs ${
                      selectedReport === report.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {report.description}
                  </p>
                </div>
              </button>
            ))}

            {/* Date Filters */}
            <div className="pt-4 border-t space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </h4>

              {(selectedReport === "trial-balance" ||
                selectedReport === "balance-sheet") && (
                <div className="space-y-2">
                  <Label>As of Date</Label>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                  />
                </div>
              )}

              {(selectedReport === "income-statement" ||
                selectedReport === "margin-analysis") && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <div className="col-span-3">{renderReport()}</div>
      </div>
    </div>
  );
}

export default function FinanceReportsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FinanceReportsContent />
    </Suspense>
  );
}
