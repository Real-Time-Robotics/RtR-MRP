import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { getExpiryAlerts } from "@/lib/inventory/expiry-alert-service";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const alerts = await getExpiryAlerts();
    return NextResponse.json(alerts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expiry alerts" }, { status: 500 });
  }
});
