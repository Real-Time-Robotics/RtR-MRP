"use client";

// src/app/(dashboard)/excel/page.tsx
// Excel Hub Dashboard

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Package,
  Truck,
  Box,
  Users,
  Warehouse,
  Layers,
} from "lucide-react";

interface RecentJob {
  id: string;
  type: string;
  fileName?: string;
  status: string;
  createdAt: string;
  totalRows?: number;
  successRows?: number;
  errorRows?: number;
}

export default function ExcelHubPage() {
  const [importJobs, setImportJobs] = useState<RecentJob[]>([]);
  const [exportJobs, setExportJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentJobs();
  }, []);

  const fetchRecentJobs = async () => {
    try {
      const [importRes, exportRes] = await Promise.all([
        fetch("/api/excel/import"),
        fetch("/api/excel/export"),
      ]);

      if (importRes.ok) {
        const data = await importRes.json();
        setImportJobs(data.jobs || []);
      }

      if (exportRes.ok) {
        const data = await exportRes.json();
        setExportJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "processing":
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "parts":
        return <Package className="w-5 h-5" />;
      case "suppliers":
        return <Truck className="w-5 h-5" />;
      case "products":
        return <Box className="w-5 h-5" />;
      case "customers":
        return <Users className="w-5 h-5" />;
      case "inventory":
        return <Warehouse className="w-5 h-5" />;
      case "bom":
        return <Layers className="w-5 h-5" />;
      default:
        return <FileSpreadsheet className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Excel Integration</h1>
        <p className="text-gray-500 dark:text-neutral-400 mt-1">
          Import, export, and manage your data with Excel files
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/excel/import"
          className="flex items-center gap-4 p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Import Data</h3>
            <p className="text-blue-100 text-sm">Upload Excel or CSV files</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto" />
        </Link>

        <Link
          href="/excel/export"
          className="flex items-center gap-4 p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Export Data</h3>
            <p className="text-green-100 text-sm">Download data as Excel</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto" />
        </Link>

        <Link
          href="/excel/templates"
          className="flex items-center gap-4 p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Templates</h3>
            <p className="text-purple-100 text-sm">Download import templates</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto" />
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Imports */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Imports</h2>
            <Link
              href="/excel/import"
              className="text-sm text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-neutral-700">
            {loading ? (
              <div className="p-6 text-center text-gray-500 dark:text-neutral-400">Loading...</div>
            ) : importJobs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-neutral-400">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No imports yet</p>
                <Link
                  href="/excel/import"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Start your first import
                </Link>
              </div>
            ) : (
              importJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      {getEntityIcon(job.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm dark:text-white">
                        {job.fileName || `${job.type} import`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        {formatDate(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === "completed" && (
                      <span className="text-xs text-gray-500 dark:text-neutral-400">
                        {job.successRows}/{job.totalRows}
                      </span>
                    )}
                    {getStatusIcon(job.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Exports */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Exports</h2>
            <Link
              href="/excel/export"
              className="text-sm text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-neutral-700">
            {loading ? (
              <div className="p-6 text-center text-gray-500 dark:text-neutral-400">Loading...</div>
            ) : exportJobs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-neutral-400">
                <Download className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No exports yet</p>
                <Link
                  href="/excel/export"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Export your data
                </Link>
              </div>
            ) : (
              exportJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                      {getEntityIcon(job.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm dark:text-white">
                        {job.fileName || `${job.type} export`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        {formatDate(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(job.status)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Data Types Grid */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          Supported Data Types
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { type: "parts", label: "Parts", icon: Package },
            { type: "suppliers", label: "Suppliers", icon: Truck },
            { type: "products", label: "Products", icon: Box },
            { type: "customers", label: "Customers", icon: Users },
            { type: "inventory", label: "Inventory", icon: Warehouse },
            { type: "bom", label: "BOM", icon: Layers },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.type}
                className="p-4 border border-gray-200 dark:border-neutral-700 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
              >
                <div className="w-10 h-10 mx-auto rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center text-gray-600 dark:text-neutral-300 mb-2">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm dark:text-white">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
