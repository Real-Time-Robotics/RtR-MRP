// src/app/api/finance/reports/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withRoleAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import { getTrialBalance, getVarianceSummary } from "@/lib/finance";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
// GET - Get financial reports
export const GET = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Role-based access control: Finance routes require ADMIN or MANAGER

    const { searchParams } = new URL(request.url);
    const report = searchParams.get("report");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    switch (report) {
      case "trial-balance": {
        const asOfDate = searchParams.get("asOfDate");
        const trialBalance = await getTrialBalance(
          asOfDate ? new Date(asOfDate) : undefined
        );
        return NextResponse.json({ report: "trial-balance", data: trialBalance });
      }

      case "income-statement": {
        const incomeStatement = await generateIncomeStatement(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        return NextResponse.json({ report: "income-statement", data: incomeStatement });
      }

      case "balance-sheet": {
        const asOfDate = searchParams.get("asOfDate");
        const balanceSheet = await generateBalanceSheet(
          asOfDate ? new Date(asOfDate) : undefined
        );
        return NextResponse.json({ report: "balance-sheet", data: balanceSheet });
      }

      case "variance-summary": {
        const now = new Date();
        const year = startDate ? new Date(startDate).getFullYear() : now.getFullYear();
        const month = startDate ? new Date(startDate).getMonth() + 1 : now.getMonth() + 1;
        const varianceSummary = await getVarianceSummary(year, month);
        return NextResponse.json({ report: "variance-summary", data: varianceSummary });
      }

      case "cost-analysis": {
        const costAnalysis = await generateCostAnalysis();
        return NextResponse.json({ report: "cost-analysis", data: costAnalysis });
      }

      case "margin-analysis": {
        const marginAnalysis = await generateMarginAnalysis(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        return NextResponse.json({ report: "margin-analysis", data: marginAnalysis });
      }

      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/finance/reports' });
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
});

// Generate Income Statement
async function generateIncomeStatement(startDate?: Date, endDate?: Date) {
  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  // Get revenue accounts (REVENUE type)
  const revenueAccounts = await prisma.gLAccount.findMany({
    where: { accountType: "REVENUE", isActive: true },
  });

  // Get expense accounts (EXPENSE type)
  const expenseAccounts = await prisma.gLAccount.findMany({
    where: { accountType: "EXPENSE", isActive: true },
  });

  // Calculate revenue totals from journal lines
  const revenueLines = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: {
      account: { accountType: "REVENUE" },
      journalEntry: {
        status: "POSTED",
        ...(startDate || endDate ? { entryDate: dateFilter } : {}),
      },
    },
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  // Calculate expense totals
  const expenseLines = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: {
      account: { accountType: "EXPENSE" },
      journalEntry: {
        status: "POSTED",
        ...(startDate || endDate ? { entryDate: dateFilter } : {}),
      },
    },
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  // Build revenue section
  const revenueItems = await Promise.all(
    revenueLines.map(async (line) => {
      const account = revenueAccounts.find((a) => a.id === line.accountId);
      const balance = (line._sum.creditAmount || 0) - (line._sum.debitAmount || 0);
      return {
        accountNumber: account?.accountNumber,
        accountName: account?.name,
        amount: balance,
      };
    })
  );

  // Build expense section
  const expenseItems = await Promise.all(
    expenseLines.map(async (line) => {
      const account = expenseAccounts.find((a) => a.id === line.accountId);
      const balance = (line._sum.debitAmount || 0) - (line._sum.creditAmount || 0);
      return {
        accountNumber: account?.accountNumber,
        accountName: account?.name,
        amount: balance,
      };
    })
  );

  const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  return {
    period: {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    revenue: {
      items: revenueItems.filter((i) => i.amount !== 0),
      total: totalRevenue,
    },
    expenses: {
      items: expenseItems.filter((i) => i.amount !== 0),
      total: totalExpenses,
    },
    netIncome,
  };
}

// Generate Balance Sheet
async function generateBalanceSheet(asOfDate?: Date) {
  const dateFilter = asOfDate ? { lte: asOfDate } : {};

  // Get account balances by type
  const accountTypes = ["ASSET", "LIABILITY", "EQUITY"] as const;
  const sections: Record<string, { items: { accountNumber: string; accountName: string; amount: number }[]; total: number }> = {};

  for (const accountType of accountTypes) {
    const accounts = await prisma.gLAccount.findMany({
      where: { accountType, isActive: true },
    });

    const balances = await prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        account: { accountType },
        journalEntry: {
          status: "POSTED",
          ...(asOfDate ? { entryDate: dateFilter } : {}),
        },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const items = balances.map((balance) => {
      const account = accounts.find((a) => a.id === balance.accountId);
      const isDebitNormal = accountType === "ASSET";
      const amount = isDebitNormal
        ? (balance._sum.debitAmount || 0) - (balance._sum.creditAmount || 0)
        : (balance._sum.creditAmount || 0) - (balance._sum.debitAmount || 0);
      return {
        accountNumber: account?.accountNumber || "",
        accountName: account?.name || "",
        amount,
      };
    });

    sections[accountType.toLowerCase()] = {
      items: items.filter((i) => i.amount !== 0),
      total: items.reduce((sum, item) => sum + item.amount, 0),
    };
  }

  return {
    asOfDate: asOfDate?.toISOString() || new Date().toISOString(),
    assets: sections.asset,
    liabilities: sections.liability,
    equity: sections.equity,
    totalLiabilitiesAndEquity: sections.liability.total + sections.equity.total,
  };
}

// Generate Cost Analysis Report
async function generateCostAnalysis() {
  const rollups = await prisma.partCostRollup.findMany({
    include: {
      part: {
        select: { partNumber: true, name: true, category: true },
      },
    },
    orderBy: { totalStandardCost: "desc" },
    take: 50,
  });

  const summary = {
    totalParts: rollups.length,
    totalMaterialCost: 0,
    totalLaborCost: 0,
    totalOverheadCost: 0,
    totalSubcontractCost: 0,
    totalOtherCost: 0,
    grandTotal: 0,
  };

  const items = rollups.map((r) => {
    summary.totalMaterialCost += r.materialCost;
    summary.totalLaborCost += r.laborCost;
    summary.totalOverheadCost += r.overheadCost;
    summary.totalSubcontractCost += r.subcontractCost;
    summary.totalOtherCost += r.otherCost;
    summary.grandTotal += r.totalStandardCost;

    return {
      partNumber: r.part.partNumber,
      partName: r.part.name,
      category: r.part.category,
      materialCost: r.materialCost,
      laborCost: r.laborCost,
      overheadCost: r.overheadCost,
      subcontractCost: r.subcontractCost,
      otherCost: r.otherCost,
      totalCost: r.totalStandardCost,
      bomLevel: r.bomLevel,
      isStale: r.rollupStatus === "STALE",
    };
  });

  return {
    summary,
    items,
    costBreakdown: {
      material: summary.totalMaterialCost,
      labor: summary.totalLaborCost,
      overhead: summary.totalOverheadCost,
      subcontract: summary.totalSubcontractCost,
      other: summary.totalOtherCost,
    },
  };
}

// Generate Margin Analysis Report
async function generateMarginAnalysis(startDate?: Date, endDate?: Date) {
  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  // Get sales invoices with costs
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      status: { in: ["SENT", "PARTIALLY_PAID", "PAID"] },
      ...(startDate || endDate ? { invoiceDate: dateFilter } : {}),
    },
    include: {
      customer: {
        select: { code: true, name: true },
      },
      lines: {
        include: {
          part: {
            include: {
              costRollup: true,
            },
          },
          product: true,
        },
      },
    },
  });

  const analysis = invoices.map((invoice) => {
    let revenue = 0;
    let cost = 0;

    invoice.lines.forEach((line) => {
      const lineRevenue = line.quantity * line.unitPrice;
      revenue += lineRevenue;

      if (line.part?.costRollup) {
        cost += line.quantity * line.part.costRollup.totalStandardCost;
      }
    });

    const margin = revenue - cost;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customer: invoice.customer,
      revenue,
      cost,
      margin,
      marginPercent,
    };
  });

  const totals = analysis.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue,
      cost: acc.cost + item.cost,
      margin: acc.margin + item.margin,
    }),
    { revenue: 0, cost: 0, margin: 0 }
  );

  return {
    period: {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    invoices: analysis,
    totals: {
      ...totals,
      marginPercent: totals.revenue > 0 ? (totals.margin / totals.revenue) * 100 : 0,
    },
  };
}
