"use client";

import { useState } from "react";
import {
  FileText,
  Package,
  ShoppingCart,
  ClipboardList,
  Truck,
  Download,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const reportTypes: ReportType[] = [
  {
    id: "inventory",
    name: "Inventory Report",
    description: "Stock levels, valuation, and movement analysis",
    icon: Package,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "orders",
    name: "Sales Orders Report",
    description: "Sales summary by customer, product, and period",
    icon: ShoppingCart,
    color: "bg-green-100 text-green-600",
  },
  {
    id: "purchasing",
    name: "Purchasing Report",
    description: "PO summary, spending analysis by supplier",
    icon: ClipboardList,
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "suppliers",
    name: "Supplier Performance",
    description: "Delivery performance, quality metrics, risk scores",
    icon: Truck,
    color: "bg-purple-100 text-purple-600",
  },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [format, setFormat] = useState("xlsx");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: string) => {
    setIsExporting(true);
    setSelectedReport(type);

    try {
      const response = await fetch(`/api/export?type=${type}&format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}_${new Date().toISOString().split("T")[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
      setSelectedReport(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export reports for your business data"
      />

      {/* Quick Export Options */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Quick Export:</span>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              <SelectItem value="csv">CSV (.csv)</SelectItem>
              <SelectItem value="pdf">PDF (.pdf)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("parts")}
              disabled={isExporting}
            >
              <Package className="h-4 w-4 mr-2" />
              Parts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("suppliers")}
              disabled={isExporting}
            >
              <Truck className="h-4 w-4 mr-2" />
              Suppliers
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("orders")}
              disabled={isExporting}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Orders
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Types */}
      <div className="grid grid-cols-2 gap-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${report.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(report.id)}
                    disabled={isExporting && selectedReport === report.id}
                  >
                    {isExporting && selectedReport === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </>
                    )}
                  </Button>
                </div>
                <CardTitle className="text-lg mt-4">{report.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {report.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Exports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent exports</p>
            <p className="text-sm">Export a report to see it here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
