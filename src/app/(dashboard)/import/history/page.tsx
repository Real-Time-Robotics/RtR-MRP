"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Brain,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

interface ImportSessionData {
  id: string;
  fileName: string;
  detectedType: string;
  status: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedRows: number;
  confidence: number;
  createdAt: string;
}

export default function ImportHistoryPage() {
  const [history, setHistory] = useState<ImportSessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/import/history")
      .then((res) => res.json())
      .then((data) => {
        // Handle both response shapes
        setHistory(data.history || data.data?.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Hoàn thành
          </Badge>
        );
      case "COMPLETED_WITH_ERRORS":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <XCircle className="h-3 w-3 mr-1" />
            Có lỗi
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Thất bại
          </Badge>
        );
      case "IMPORTING":
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Đang import
          </Badge>
        );
      case "ANALYZING":
        return (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <Brain className="h-3 w-3 mr-1" />
            Đang phân tích
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7" />
            Lịch sử Import
          </h1>
          <p className="text-muted-foreground mt-1">
            Xem lại các phiên import trước đó
          </p>
        </div>
        <Link href="/import/smart">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Brain className="h-4 w-4 mr-2" />
            Import mới
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thành công</TableHead>
                <TableHead className="text-right">Bỏ qua</TableHead>
                <TableHead className="text-right">Lỗi</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Chưa có lịch sử import</p>
                    <Link href="/import/smart">
                      <Button variant="link" className="mt-2">
                        Bắt đầu import đầu tiên
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {item.fileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.detectedType}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">
                      {item.successRows}
                    </TableCell>
                    <TableCell className="text-right text-amber-600 dark:text-amber-400">
                      {item.skippedRows}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {item.failedRows}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        locale: vi,
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
