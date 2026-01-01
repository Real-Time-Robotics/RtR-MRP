import { redirect } from "next/navigation";

// Redirect to main dashboard
export default function DashboardRedirect() {
  redirect("/home");
}
