import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client";

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
    redirect("/login");
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
