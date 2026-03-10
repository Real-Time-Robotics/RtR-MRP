import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export default function CostRoadmapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Target Roadmap"
        description="Lo trinh giam chi phi voi phases va actions"
        backHref="/cost-optimization"
      />
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground mt-2">
            Thiet lap muc tieu chi phi, tao phases va theo doi tien do tung action.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
