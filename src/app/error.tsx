"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { clientLogger } from '@/lib/client-logger';

export default function Error({
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
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">Có lỗi xảy ra!</h2>
      <p className="text-gray-600">{error.message}</p>
      <Button onClick={() => reset()}>Thử lại</Button>
    </div>
  );
}
