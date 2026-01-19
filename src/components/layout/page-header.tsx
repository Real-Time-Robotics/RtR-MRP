"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string; // Fallback URL khi không có history
  showBack?: boolean; // Hiển thị nút back (mặc định: true nếu có backHref)
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  showBack,
  actions,
}: PageHeaderProps) {
  const router = useRouter();

  // Hiển thị back button nếu showBack=true hoặc có backHref
  const shouldShowBack = showBack ?? !!backHref;

  const handleBack = () => {
    // Kiểm tra xem có history để back không
    // window.history.length > 1 nghĩa là có trang trước đó
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else if (backHref) {
      // Fallback về URL chỉ định nếu không có history
      router.push(backHref);
    } else {
      // Fallback về home nếu không có gì
      router.push("/home");
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {shouldShowBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            title="Quay lại trang trước"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
