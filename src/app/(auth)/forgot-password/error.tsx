'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for monitoring
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Đã xảy ra lỗi</h2>
        <p className="text-muted-foreground">Vui lòng thử lại hoặc quay về trang đăng nhập.</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="outline">Thử lại</Button>
          <Button onClick={() => window.location.href = '/login'}>Đăng nhập</Button>
        </div>
      </div>
    </div>
  );
}
