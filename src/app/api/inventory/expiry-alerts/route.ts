import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getExpiryAlerts } from "@/lib/inventory/expiry-alert-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const alerts = await getExpiryAlerts();
    return NextResponse.json(alerts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expiry alerts" }, { status: 500 });
  }
}
