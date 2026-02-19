"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold">Đã xảy ra lỗi</h2>
          <p className="text-gray-600">
            {process.env.NODE_ENV === 'development'
              ? error.message
              : 'Hệ thống gặp sự cố. Vui lòng thử lại hoặc liên hệ quản trị viên.'}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => reset()}>Thử lại</Button>
            <Button variant="outline" onClick={() => window.location.href = '/home'}>
              Về trang chủ
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
