// src/app/api/compliance/mfa/verify/route.ts
// MFA verification via compliance module moved to /api/v2/auth (verify-mfa action)

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: 'MFA verification has moved to /api/v2/auth with action: verify-mfa',
    },
    { status: 410 }
  );
}
