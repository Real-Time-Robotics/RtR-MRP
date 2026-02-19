import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { getAllFeatureFlags, setFeatureFlag, FEATURE_FLAGS } from "@/lib/features/feature-flags";
import type { FeatureFlagKey } from "@/lib/features/feature-flags";
import { z } from "zod";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
const validKeys = new Set<string>(Object.values(FEATURE_FLAGS));

const FeatureFlagUpdateSchema = z.object({
  key: z.string().min(1, "Flag key is required"),
  value: z.enum(["true", "false"]),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const flags = await getAllFeatureFlags();
    return NextResponse.json({ success: true, flags });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();

    const validation = FeatureFlagUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { key, value } = validation.data;

    if (!validKeys.has(key)) {
      return NextResponse.json({ error: `Invalid flag key: ${key}` }, { status: 400 });
    }

    await setFeatureFlag(key as FeatureFlagKey, value === "true", session.user?.id);

    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update feature flag" },
      { status: 500 }
    );
  }
});
