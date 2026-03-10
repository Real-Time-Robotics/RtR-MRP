"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AnalysisForm } from "@/components/cost-optimization/make-vs-buy/analysis-form";

export default function NewAnalysisPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Tao phan tich Make vs Buy"
        description="Nhap du lieu de phan tich ROI va khuyen nghi tu dong"
        backHref="/cost-optimization/make-vs-buy"
      />
      <AnalysisForm />
    </div>
  );
}
