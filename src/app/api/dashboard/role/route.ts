import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { getRoleDashboard } from "@/lib/dashboard/role-dashboard-service";

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export const GET = withAuth(async (request: NextRequest, _context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const role = session.user.role || "viewer";
    const userId = session.user.id || "system";

    const data = await getRoleDashboard(userId, role as "admin" | "manager" | "operator" | "viewer");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
});
