"use client";

// src/app/(dashboard)/excel/export/page.tsx
// Export Center Page

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Package,
  Truck,
  Box,
  Users,
  Warehouse,
  ShoppingCart,
  ClipboardList,
  Factory,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clientLogger } from '@/lib/client-logger';

const EXPORT_TYPES = [
  {
    value: "parts",
    label: "Parts",
    description: "Export all parts with stock levels",
    icon: Package,
    color: "blue",
  },
  {
    value: "suppliers",
    label: "Suppliers",
    description: "Export supplier master data",
    icon: Truck,
    color: "orange",
  },
  {
    value: "products",
    label: "Products",
    description: "Export product catalog",
    icon: Box,
    color: "purple",
  },
  {
    value: "customers",
    label: "Customers",
    description: "Export customer information",
    icon: Users,
    color: "green",
  },
  {
    value: "inventory",
    label: "Inventory",
    description: "Export current stock levels",
    icon: Warehouse,
    color: "teal",
  },
  {
    value: "salesOrders",
    label: "Sales Orders",
    description: "Export sales order history",
    icon: ShoppingCart,
    color: "pink",
  },
  {
    value: "purchaseOrders",
    label: "Purchase Orders",
    description: "Export purchase order history",
    icon: ClipboardList,
    color: "amber",
  },
  {
    value: "workOrders",
    label: "Work Orders",
    description: "Export production orders",
    icon: Factory,
    color: "indigo",
  },
];

export default function ExportPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [filters, setFilters] = useState<{
    status?: string;
    fromDate?: string;
    toDate?: string;
  }>({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    if (!selectedType) return;

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const response = await fetch("/api/excel/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          format,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get the file from response
      const blob = await response.blob();
      const fileName =
        response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
        `${selectedType}_export.${format}`;

      // Download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      clientLogger.error("Export error:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      blue: { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-600" },
      orange: { bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-600" },
      purple: { bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-600" },
      green: { bg: "bg-green-50", border: "border-green-500", text: "text-green-600" },
      teal: { bg: "bg-teal-50", border: "border-teal-500", text: "text-teal-600" },
      pink: { bg: "bg-pink-50", border: "border-pink-500", text: "text-pink-600" },
      amber: { bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-600" },
      indigo: { bg: "bg-indigo-50", border: "border-indigo-500", text: "text-indigo-600" },
    };
    return isSelected ? colors[color] : { bg: "", border: "border-gray-200", text: "text-gray-600" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/excel"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Export Center</h1>
          <p className="text-gray-500 mt-1">
            Export your data to Excel or CSV format
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Types */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Select Data Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXPORT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.value;
              const colors = getColorClasses(type.color, isSelected);

              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={cn(
                    "p-4 border-2 rounded-xl text-left transition-all hover:shadow-md",
                    isSelected ? colors.border : "border-gray-200 hover:border-gray-300",
                    isSelected && colors.bg
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                      isSelected ? colors.bg : "bg-gray-100"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", colors.text)} />
                  </div>
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {type.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Export Options</h2>

          <div className="space-y-4">
            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormat("xlsx")}
                  className={cn(
                    "flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-colors",
                    format === "xlsx"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => setFormat("csv")}
                  className={cn(
                    "flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-colors",
                    format === "csv"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  CSV
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value || undefined })
                }
                aria-label="Bộ lọc trạng thái"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range (Optional)
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.fromDate || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, fromDate: e.target.value || undefined })
                  }
                  aria-label="Từ ngày"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filters.toDate || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, toDate: e.target.value || undefined })
                  }
                  aria-label="Đến ngày"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={!selectedType || isExporting}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors",
                selectedType && !isExporting
                  ? "bg-success-600 text-white hover:bg-success-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-success-50 border border-success-200 rounded-xl p-6">
        <h3 className="font-semibold text-success-900 mb-2">Export Tips</h3>
        <ul className="text-sm text-success-800 space-y-1">
          <li>
            - Excel format (.xlsx) preserves formatting and formulas
          </li>
          <li>
            - CSV format is best for data processing and compatibility
          </li>
          <li>
            - Use date filters to export specific time periods
          </li>
          <li>
            - Exports include all visible columns for the selected data type
          </li>
        </ul>
      </div>
    </div>
  );
}
