import type { Metadata } from 'next';
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: 'Dashboard | RTR-MRP',
  description: 'RTR-MRP manufacturing dashboard overview - Tổng quan bảng điều khiển sản xuất RTR-MRP',
};

// Redirect to main dashboard
export default function DashboardRedirect() {
  redirect("/home");
}
