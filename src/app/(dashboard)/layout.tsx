import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client";
import { getUserRoles } from "@/lib/auth/rbac";

// All dashboard pages require auth + DB — disable static generation
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    template: '%s | RTR MRP',
    default: 'Tổng quan',
  },
  description: 'Bảng điều khiển quản lý sản xuất RTR MRP',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    const authUrl = process.env.RTR_AUTH_GATEWAY_URL || 'https://auth.rtrobotics.com';
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://mrp.rtrobotics.com';
    redirect(`${authUrl}/login?redirect=${encodeURIComponent(appUrl + '/home')}`);
  }

  let userRoles: import('@/lib/auth/rbac').RoleCode[] = [];
  const userId = session?.user?.id;
  try {
    if (userId) {
      userRoles = await getUserRoles(userId);
    }
  } catch {
    // getUserRoles may fail if user doesn't exist in MRP DB yet
    // Gracefully continue with empty roles — sidebar will show default groups
  }

  return (
    <DashboardLayoutClient userRoles={userRoles} userId={userId}>
      {children}
    </DashboardLayoutClient>
  );
}
