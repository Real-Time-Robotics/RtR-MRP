// =============================================================================
// API: /api/ai/alerts/preferences
// User notification preferences
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { unifiedAlertService, NotificationPreferences } from '@/lib/ai/alerts';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
const preferencesUpdateSchema = z.object({
  inApp: z.object({
    enabled: z.boolean(),
    criticalOnly: z.boolean(),
    soundEnabled: z.boolean(),
  }).optional(),
  email: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['immediate', 'daily', 'weekly', 'never']),
    criticalImmediate: z.boolean(),
    digestTime: z.string().optional(),
  }).optional(),
  sources: z.record(z.string(), z.object({
    enabled: z.boolean(),
    minPriority: z.string(),
  })).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
  }).passthrough().optional(),
}).passthrough();

// =============================================================================
// GET: Get user preferences
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const preferences = unifiedAlertService.getUserPreferences(session.user.id);

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/alerts/preferences' });
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
});

// =============================================================================
// PUT: Update user preferences
// =============================================================================

export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const body = await request.json();
    const parsed = preferencesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const updates: Partial<NotificationPreferences> = parsed.data as Partial<NotificationPreferences>;

    const preferences = unifiedAlertService.updateUserPreferences(
      session.user.id,
      updates
    );

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/ai/alerts/preferences' });
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
});
