// src/app/api/finance/gl/journals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createJournalEntry,
  postJournalEntry,
  voidJournalEntry,
  reverseJournalEntry,
} from "@/lib/finance";
import { logger } from "@/lib/logger";

// GET - Get journal entries
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const journalId = searchParams.get("id");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get single journal entry
    if (journalId) {
      const journal = await prisma.journalEntry.findUnique({
        where: { id: journalId },
        include: {
          lines: {
            include: {
              account: {
                select: { accountNumber: true, name: true },
              },
            },
            orderBy: { lineNumber: "asc" },
          },
        },
      });

      if (!journal) {
        return NextResponse.json(
          { error: "Journal entry not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(journal);
    }

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) (where.entryDate as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.entryDate as Record<string, Date>).lte = new Date(endDate);
    }

    // Get list of journal entries
    const journals = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: {
              select: { accountNumber: true, name: true },
            },
          },
        },
      },
      orderBy: { entryDate: "desc" },
      take: 100,
    });

    return NextResponse.json({ journals });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/finance/gl/journals' });
    return NextResponse.json(
      { error: "Failed to get journal entries" },
      { status: 500 }
    );
  }
}

// POST - Create journal entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entryDate, description, reference, lines, autoPost } = body;

    if (!entryDate || !description || !lines?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await createJournalEntry(
      {
        entryDate: new Date(entryDate),
        description,
        reference,
        lines,
      },
      session.user.id
    );

    // Auto-post if requested
    if (autoPost && result.entryId) {
      await postJournalEntry(result.entryId, session.user.id);
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/finance/gl/journals' });
    const message = error instanceof Error ? error.message : "Failed to create journal entry";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PUT - Post, void, or reverse journal entry
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { journalId, action } = body;

    if (!journalId || !action) {
      return NextResponse.json(
        { error: "journalId and action are required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "post":
        await postJournalEntry(journalId, session.user.id);
        return NextResponse.json({ success: true, message: "Journal entry posted" });

      case "void":
        await voidJournalEntry(journalId);
        return NextResponse.json({ success: true, message: "Journal entry voided" });

      case "reverse":
        const reverseResult = await reverseJournalEntry(journalId, new Date(), session.user.id);
        return NextResponse.json({
          success: true,
          message: "Journal entry reversed",
          reversalEntryId: reverseResult.entryId,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/finance/gl/journals' });
    const message = error instanceof Error ? error.message : "Failed to update journal entry";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
