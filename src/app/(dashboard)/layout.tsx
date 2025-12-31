import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import AIWrapper from "@/components/ai-copilot/ai-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900 p-6">
          <AIWrapper>
            <div className="max-w-7xl mx-auto">{children}</div>
          </AIWrapper>
        </main>
      </div>
    </div>
  );
}
