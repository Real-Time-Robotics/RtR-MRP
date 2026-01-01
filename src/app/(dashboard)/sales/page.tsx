import { redirect } from "next/navigation";

// Sales page redirects to Orders
export default function SalesPage() {
  redirect("/orders");
}
