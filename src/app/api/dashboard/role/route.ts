import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRoleDashboard } from "@/lib/dashboard/role-dashboard-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as { role?: string })?.role || "viewer";
    const userId = session.user?.id || "system";

    const data = await getRoleDashboard(userId, role as "admin" | "manager" | "operator" | "viewer");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
