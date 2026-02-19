// src/app/api/finance/gl/journals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withRoleAuth } from '@/lib/api/with-auth';
import { prisma } from "@/lib/prisma";
import {
  createJournalEntry,
  postJournalEntry,
  voidJournalEntry,
  reverseJournalEntry,
} from "@/lib/finance";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const JournalLineSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  debitAmount: z.number().min(0).default(0),
  creditAmount: z.number().min(0).default(0),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
  costCenterId: z.string().optional(),
});

const JournalCreateSchema = z.object({
  entryDate: z.string().min(1, "Entry date is required"),
  description: z.string().min(1, "Description is required"),
  reference: z.string().optional(),
  lines: z.array(JournalLineSchema).min(1, "At least one journal line is required"),
  autoPost: z.boolean().optional().default(false),
});

const JournalActionSchema = z.object({
  journalId: z.string().min(1, "Journal ID is required"),
  action: z.enum(["post", "void", "reverse"]),
});

// GET - Get journal entries
export const GET = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
  // Rate limiting
  const readRateLimitResult = await checkReadEndpointLimit(request);
  if (readRateLimitResult) return readRateLimitResult;

  try {
// Role-based access control: Finance routes require ADMIN or MANAGER

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
});

// POST - Create journal entry
export const POST = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
  try {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;
// Role-based access control: Finance routes require ADMIN or MANAGER

    const body = await request.json();

    const validation = JournalCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const result = await createJournalEntry(
      {
        entryDate: new Date(data.entryDate),
        description: data.description,
        reference: data.reference,
        lines: data.lines,
      },
      session.user.id
    );

    // Auto-post if requested
    if (data.autoPost && result.entryId) {
      await postJournalEntry(result.entryId, session.user.id);
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/finance/gl/journals' });
    return NextResponse.json(
      { error: "Failed to create journal entry" },
      { status: 500 }
    );
  }
});

// PUT - Post, void, or reverse journal entry
export const PUT = withRoleAuth(['admin', 'manager'], async (request, context, session) => {
  // Rate limiting
  const putRateLimitResult = await checkWriteEndpointLimit(request);
  if (putRateLimitResult) return putRateLimitResult;

  try {
// Role-based access control: Finance routes require ADMIN or MANAGER

    const body = await request.json();

    const validation = JournalActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { journalId, action } = validation.data;

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
    return NextResponse.json(
      { error: "Failed to update journal entry" },
      { status: 500 }
    );
  }
});
