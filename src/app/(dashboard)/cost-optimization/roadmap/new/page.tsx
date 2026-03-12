"use client";

import { PageHeader } from "@/components/layout/page-header";
import { TargetForm } from "@/components/cost-optimization/roadmap/target-form";

export default function NewTargetPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Tao muc tieu chi phi"
        description="Thiet lap muc tieu giam chi phi cho san pham"
        backHref="/cost-optimization/roadmap"
      />
      <TargetForm />
    </div>
  );
}
