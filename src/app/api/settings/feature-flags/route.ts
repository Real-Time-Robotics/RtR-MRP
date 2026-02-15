import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllFeatureFlags, setFeatureFlag, FEATURE_FLAGS } from "@/lib/features/feature-flags";
import type { FeatureFlagKey } from "@/lib/features/feature-flags";

const validKeys = new Set<string>(Object.values(FEATURE_FLAGS));

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const flags = await getAllFeatureFlags();
    return NextResponse.json({ success: true, flags });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch flags" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof value !== "string") {
      return NextResponse.json({ error: "Invalid request: key and value required" }, { status: 400 });
    }

    if (!validKeys.has(key)) {
      return NextResponse.json({ error: `Invalid flag key: ${key}` }, { status: 400 });
    }

    if (value !== "true" && value !== "false") {
      return NextResponse.json({ error: "Value must be 'true' or 'false'" }, { status: 400 });
    }

    await setFeatureFlag(key as FeatureFlagKey, value === "true", session.user?.id);

    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update flag" },
      { status: 500 }
    );
  }
}
