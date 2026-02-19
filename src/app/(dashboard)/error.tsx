"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { clientLogger } from '@/lib/client-logger';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    clientLogger.error('Page error', error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-2xl font-bold">Có lỗi xảy ra!</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {process.env.NODE_ENV === 'development'
          ? error.message
          : 'Không thể tải trang này. Vui lòng thử lại.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Thử lại</Button>
        <Button variant="outline" onClick={() => window.location.href = '/home'}>
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}
