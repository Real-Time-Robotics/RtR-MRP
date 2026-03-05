"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Brain } from "lucide-react";
import Link from "next/link";
import { ImportHistory } from "@/components/import/import-history";

export default function ImportHistoryPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7" />
            Lịch sử Import
          </h1>
          <p className="text-muted-foreground mt-1">
            Xem lại các phiên import trước đó, hoàn tác hoặc xem chi tiết
          </p>
        </div>
        <Link href="/import/smart">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Brain className="h-4 w-4 mr-2" />
            Import mới
          </Button>
        </Link>
      </div>

      <ImportHistory />
    </div>
  );
}
