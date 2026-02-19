"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CreateBomHeaderButtonProps {
  productId: string;
  productName: string;
}

export function CreateBomHeaderButton({ productId, productName }: CreateBomHeaderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          version: "1.0",
          effectiveDate: new Date().toISOString().split("T")[0],
          status: "draft",
          notes: null,
        }),
      });

      if (res.ok) {
        toast.success("Đã tạo BOM Header. Bạn có thể thêm parts ngay.");
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "Lỗi tạo BOM Header");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center py-12 space-y-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-medium">Chưa có BOM cho &quot;{productName}&quot;</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tạo BOM Header để bắt đầu thêm component parts.
        </p>
      </div>
      <Button onClick={handleCreate} disabled={loading} size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang tạo...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Tạo BOM Header
          </>
        )}
      </Button>
    </div>
  );
}
