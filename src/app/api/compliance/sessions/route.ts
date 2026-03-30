// src/app/api/compliance/sessions/route.ts
// Session management is now handled by RTR Auth Gateway

import { NextResponse } from "next/server";

const AUTH_GATEWAY_URL = process.env.RTR_AUTH_GATEWAY_URL || 'https://auth.rtrobotics.com';

export async function GET() {
  return NextResponse.json(
    {
      error: 'Session management has moved to Auth Gateway',
      redirect: `${AUTH_GATEWAY_URL}/admin/sessions`,
    },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Session management has moved to Auth Gateway',
      redirect: `${AUTH_GATEWAY_URL}/admin/sessions`,
    },
    { status: 410 }
  );
}
