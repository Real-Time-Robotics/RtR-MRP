"use client";

import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ChatInterface } from "@/components/cost-optimization/advisor/chat-interface";

export default function AIAdvisorPage() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q") || undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Cost Advisor"
        description="Tư vấn AI về cơ hội giảm chi phí sản xuất"
        backHref="/cost-optimization"
      />
      <ChatInterface initialQuestion={initialQuestion} />
    </div>
  );
}
