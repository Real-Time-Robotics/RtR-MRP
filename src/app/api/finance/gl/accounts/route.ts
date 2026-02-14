// src/app/api/finance/gl/accounts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccountBalance, getTrialBalance } from "@/lib/finance";
import { logger } from "@/lib/logger";

// GET - Get GL accounts
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const accountId = searchParams.get("id");
    const accountType = searchParams.get("type");

    // Get trial balance
    if (action === "trial-balance") {
      const asOfDate = searchParams.get("asOfDate");
      const trialBalance = await getTrialBalance(
        asOfDate ? new Date(asOfDate) : undefined
      );
      return NextResponse.json({ trialBalance });
    }

    // Get account balance
    if (action === "balance" && accountId) {
      const asOfDate = searchParams.get("asOfDate");
      const balance = await getAccountBalance(
        accountId,
        asOfDate ? new Date(asOfDate) : undefined
      );
      return NextResponse.json(balance);
    }

    // Get single account
    if (accountId) {
      const account = await prisma.gLAccount.findUnique({
        where: { id: accountId },
        include: {
          parent: true,
          children: true,
        },
      });

      if (!account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(account);
    }

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    if (accountType) where.accountType = accountType;

    // Get list of accounts
    const accounts = await prisma.gLAccount.findMany({
      where,
      orderBy: { accountNumber: "asc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/finance/gl/accounts' });
    return NextResponse.json(
      { error: "Failed to get accounts" },
      { status: 500 }
    );
  }
}

// POST - Create GL account
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountNumber,
      name,
      description,
      accountType,
      accountCategory,
      parentId,
      normalBalance,
      currencyCode,
    } = body;

    if (!accountNumber || !name || !accountType || !accountCategory) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for duplicate account number
    const existing = await prisma.gLAccount.findUnique({
      where: { accountNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Account number already exists" },
        { status: 400 }
      );
    }

    const account = await prisma.gLAccount.create({
      data: {
        accountNumber,
        name,
        description,
        accountType,
        accountCategory,
        parentId,
        normalBalance: normalBalance || "DEBIT",
        currencyCode: currencyCode || "USD",
      },
    });

    return NextResponse.json({
      success: true,
      accountId: account.id,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/finance/gl/accounts' });
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

// PUT - Update GL account
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, ...updateData } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    const account = await prisma.gLAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    if (account.isSystemAccount) {
      return NextResponse.json(
        { error: "Cannot modify system account" },
        { status: 400 }
      );
    }

    await prisma.gLAccount.update({
      where: { id: accountId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/finance/gl/accounts' });
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate GL account
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("id");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    const account = await prisma.gLAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    if (account.isSystemAccount) {
      return NextResponse.json(
        { error: "Cannot delete system account" },
        { status: 400 }
      );
    }

    // Check for journal entries
    const entriesCount = await prisma.journalLine.count({
      where: { accountId },
    });

    if (entriesCount > 0) {
      // Deactivate instead of delete
      await prisma.gLAccount.update({
        where: { id: accountId },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: "Account deactivated (has journal entries)",
      });
    }

    await prisma.gLAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/finance/gl/accounts' });
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
