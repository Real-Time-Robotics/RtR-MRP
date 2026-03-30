// src/app/api/compliance/mfa/setup/route.ts
// MFA setup via compliance module moved to /api/v2/auth (enable-mfa action)

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: 'MFA setup has moved to /api/v2/auth with action: enable-mfa',
    },
    { status: 410 }
  );
}
