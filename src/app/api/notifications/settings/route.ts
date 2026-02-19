import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// NOTIFICATION SETTINGS API
// =============================================================================

const notificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean(),
    onOrder: z.boolean(),
    onStock: z.boolean(),
    onQuality: z.boolean(),
    onMention: z.boolean(),
    onApproval: z.boolean(),
  }).optional(),
  push: z.object({
    enabled: z.boolean(),
  }).optional(),
  inApp: z.object({
    sound: z.boolean(),
    desktop: z.boolean(),
  }).optional(),
  digest: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'never']),
  }).optional(),
});

// GET /api/notifications/settings - Get user notification settings
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const userId = session.user.id;

    // Get user's notification settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationSettings: true,
        notifyOnMention: true,
        notifyOnReply: true,
        notifyByEmail: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse stored settings or use defaults
    const storedSettings = user.notificationSettings as Record<string, boolean | string> | null;

    const settings = {
      email: {
        enabled: user.notifyByEmail ?? true,
        onOrder: storedSettings?.emailOnOrder ?? true,
        onStock: storedSettings?.emailOnStock ?? true,
        onQuality: storedSettings?.emailOnQuality ?? true,
        onMention: user.notifyOnMention ?? true,
        onApproval: storedSettings?.emailOnApproval ?? true,
      },
      push: {
        enabled: storedSettings?.pushEnabled ?? false,
      },
      inApp: {
        sound: storedSettings?.inAppSound ?? true,
        desktop: storedSettings?.inAppDesktop ?? true,
      },
      digest: {
        enabled: storedSettings?.digestEnabled ?? false,
        frequency: (storedSettings?.digestFrequency as 'daily' | 'weekly' | 'never') ?? 'never',
      },
    };

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/notifications/settings' });
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
  }
});

// PUT /api/notifications/settings - Update user notification settings
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const userId = session.user.id;
    const body = await request.json();
    const parsed = notificationSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const settings = parsed.data;

    // Get current settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationSettings: true },
    });

    const currentSettings = (user?.notificationSettings as Record<string, boolean | string | null>) || {};

    // Merge settings with explicit types for Prisma JSON compatibility
    const mergedSettings: Record<string, boolean | string | null> = {
      emailOnOrder: settings.email?.onOrder ?? (currentSettings.emailOnOrder as boolean) ?? true,
      emailOnStock: settings.email?.onStock ?? (currentSettings.emailOnStock as boolean) ?? true,
      emailOnQuality: settings.email?.onQuality ?? (currentSettings.emailOnQuality as boolean) ?? true,
      emailOnApproval: settings.email?.onApproval ?? (currentSettings.emailOnApproval as boolean) ?? true,
      pushEnabled: settings.push?.enabled ?? (currentSettings.pushEnabled as boolean) ?? false,
      inAppSound: settings.inApp?.sound ?? (currentSettings.inAppSound as boolean) ?? true,
      inAppDesktop: settings.inApp?.desktop ?? (currentSettings.inAppDesktop as boolean) ?? true,
      digestEnabled: settings.digest?.enabled ?? (currentSettings.digestEnabled as boolean) ?? false,
      digestFrequency: settings.digest?.frequency ?? (currentSettings.digestFrequency as string) ?? 'never',
    };

    // Update user settings
    await prisma.user.update({
      where: { id: userId },
      data: {
        notifyByEmail: settings.email?.enabled,
        notifyOnMention: settings.email?.onMention,
        notificationSettings: mergedSettings,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/notifications/settings' });
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
});
