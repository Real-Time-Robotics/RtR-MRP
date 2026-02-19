"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  FileText,
  Clock,
  Download,
  Calendar,
  Mail,
  MoreVertical,
  Play,
  Pause,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface SavedReport {
  id: string;
  name: string;
  description?: string;
  type: string;
  lastRunAt?: string;
  viewCount: number;
  isPublic: boolean;
}

interface ReportSchedule {
  id: string;
  reportId: string;
  name?: string;
  frequency: string;
  time: string;
  isActive: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  nextRunAt?: string;
}

interface ReportInstance {
  id: string;
  reportId: string;
  generatedAt: string;
  format: string;
  status: string;
  fileSize?: number;
  downloadCount: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [instances, setInstances] = useState<ReportInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for demonstration
  useEffect(() => {
    // In production, fetch from API
    setReports([
      {
        id: "1",
        name: "Báo cáo tồn kho",
        description: "Báo cáo chi tiết tồn kho theo kho và vật tư",
        type: "inventory",
        lastRunAt: new Date().toISOString(),
        viewCount: 45,
        isPublic: false,
      },
      {
        id: "2",
        name: "Báo cáo doanh thu tháng",
        description: "Doanh thu theo khách hàng và sản phẩm",
        type: "sales",
        lastRunAt: new Date().toISOString(),
        viewCount: 120,
        isPublic: true,
      },
      {
        id: "3",
        name: "Báo cáo chất lượng",
        description: "NCR và CAPA trong kỳ",
        type: "quality",
        lastRunAt: new Date().toISOString(),
        viewCount: 30,
        isPublic: false,
      },
    ]);

    setSchedules([
      {
        id: "s1",
        reportId: "1",
        name: "Báo cáo tồn kho hàng tuần",
        frequency: "weekly",
        time: "08:00",
        isActive: true,
        lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastRunStatus: "success",
        nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "s2",
        reportId: "2",
        name: "Báo cáo doanh thu hàng tháng",
        frequency: "monthly",
        time: "07:00",
        isActive: true,
        lastRunAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastRunStatus: "success",
        nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    setInstances([
      {
        id: "i1",
        reportId: "1",
        generatedAt: new Date().toISOString(),
        format: "pdf",
        status: "completed",
        fileSize: 245000,
        downloadCount: 5,
      },
      {
        id: "i2",
        reportId: "2",
        generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        format: "xlsx",
        status: "completed",
        fileSize: 180000,
        downloadCount: 12,
      },
    ]);

    setIsLoading(false);
  }, []);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      inventory: "Tồn kho",
      sales: "Bán hàng",
      production: "Sản xuất",
      quality: "Chất lượng",
      financial: "Tài chính",
      supplier: "Nhà cung cấp",
    };
    return labels[type] || type;
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: "Hàng ngày",
      weekly: "Hàng tuần",
      biweekly: "2 tuần/lần",
      monthly: "Hàng tháng",
      quarterly: "Hàng quý",
    };
    return labels[frequency] || frequency;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      success: "default",
      generating: "secondary",
      pending: "secondary",
      failed: "destructive",
    };
    const labels: Record<string, string> = {
      completed: "Hoàn thành",
      success: "Thành công",
      generating: "Đang tạo",
      pending: "Chờ xử lý",
      failed: "Lỗi",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo</h1>
          <p className="text-muted-foreground">
            Quản lý báo cáo và lịch trình xuất báo cáo
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tạo báo cáo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tổng báo cáo</span>
            </div>
            <p className="text-2xl font-bold mt-1">{reports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Lịch trình</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {schedules.filter((s) => s.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Đã tạo hôm nay</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {instances.filter((i) => {
                const today = new Date().toDateString();
                return new Date(i.generatedAt).toDateString() === today;
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Đã gửi email</span>
            </div>
            <p className="text-2xl font-bold mt-1">0</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Báo cáo</TabsTrigger>
          <TabsTrigger value="schedules">Lịch trình</TabsTrigger>
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm báo cáo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Reports table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên báo cáo</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Chạy lần cuối</TableHead>
                  <TableHead>Lượt xem</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.name}</p>
                        {report.description && (
                          <p className="text-sm text-muted-foreground">
                            {report.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(report.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      {report.lastRunAt
                        ? formatDistanceToNow(new Date(report.lastRunAt), {
                            addSuffix: true,
                            locale: vi,
                          })
                        : "Chưa chạy"}
                    </TableCell>
                    <TableCell>{report.viewCount}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Menu">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Play className="mr-2 h-4 w-4" />
                            Chạy ngay
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Calendar className="mr-2 h-4 w-4" />
                            Lên lịch
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Tải xuống
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch trình tự động</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Tần suất</TableHead>
                  <TableHead>Giờ chạy</TableHead>
                  <TableHead>Chạy tiếp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {schedule.name ||
                        reports.find((r) => r.id === schedule.reportId)?.name}
                    </TableCell>
                    <TableCell>{getFrequencyLabel(schedule.frequency)}</TableCell>
                    <TableCell>{schedule.time}</TableCell>
                    <TableCell>
                      {schedule.nextRunAt
                        ? formatDistanceToNow(new Date(schedule.nextRunAt), {
                            addSuffix: true,
                            locale: vi,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>
                        {schedule.isActive ? "Đang chạy" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          // Toggle schedule
                        }}
                        aria-label={schedule.isActive ? "Tạm dừng" : "Chạy"}
                      >
                        {schedule.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử xuất báo cáo</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Báo cáo</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Định dạng</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tải về</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => {
                  const report = reports.find((r) => r.id === instance.reportId);
                  return (
                    <TableRow key={instance.id}>
                      <TableCell className="font-medium">
                        {report?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(instance.generatedAt), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{instance.format.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(instance.fileSize)}</TableCell>
                      <TableCell>{getStatusBadge(instance.status)}</TableCell>
                      <TableCell>{instance.downloadCount}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={instance.status !== "completed"}
                          aria-label="Tải xuống"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
