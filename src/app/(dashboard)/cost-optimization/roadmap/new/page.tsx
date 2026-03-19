"use client";

import { PageHeader } from "@/components/layout/page-header";
import { TargetForm } from "@/components/cost-optimization/roadmap/target-form";

export default function NewTargetPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Tạo mục tiêu chi phí"
        description="Thiết lập mục tiêu giảm chi phí cho sản phẩm"
        backHref="/cost-optimization/roadmap"
      />
      <TargetForm />
    </div>
  );
}
