import { NextRequest } from 'next/server';
import { z } from "zod";
import { NextResponse } from "next/server";
import { approveSuggestion, rejectSuggestion } from "@/lib/mrp-engine";
import { logger } from "@/lib/logger";

const suggestionPatchSchema = z.object({
  action: z.enum(['approve', 'reject']),
  createPO: z.boolean().optional().default(false),
  userId: z.string().optional().default('system'),
});

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
// PATCH - Approve or reject suggestion
export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
    const body = await request.json();
    const parsed = suggestionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { action, createPO, userId } = parsed.data;

    if (action === "approve") {
      const result = await approveSuggestion(id, userId, createPO);
      return NextResponse.json(result);
    } else {
      const result = await rejectSuggestion(id, userId);
      return NextResponse.json(result);
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/mrp/suggestions/[id]' });
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 }
    );
  }
});
