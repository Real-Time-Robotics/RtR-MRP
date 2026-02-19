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
  Zap,
  Database,
  Loader2,
} from "lucide-react";
import { clientLogger } from '@/lib/client-logger';

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

interface StressTestInfo {
  fileExists: boolean;
  fileInfo?: {
    fileName: string;
    fileSize: number;
    sheets: { name: string; rowCount: number }[];
  };
  currentData: {
    suppliers: number;
    parts: number;
    customers: number;
    salesOrders: number;
    purchaseOrders: number;
    workOrders: number;
    ncrs: number;
  };
}

export default function ExcelHubPage() {
  const [importJobs, setImportJobs] = useState<RecentJob[]>([]);
  const [exportJobs, setExportJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [stressTestInfo, setStressTestInfo] = useState<StressTestInfo | null>(null);
  const [stressTestLoading, setStressTestLoading] = useState(false);
  const [stressTestFetching, setStressTestFetching] = useState(true);
  const [stressTestError, setStressTestError] = useState<string | null>(null);
  const [stressTestResult, setStressTestResult] = useState<{
    success: boolean;
    message: string;
    results?: Record<string, { processed: number; errors: number }>;
  } | null>(null);

  useEffect(() => {
    fetchRecentJobs();
    fetchStressTestInfo();
  }, []);

  const fetchStressTestInfo = async () => {
    setStressTestFetching(true);
    setStressTestError(null);
    try {
      const res = await fetch('/api/excel/stress-test');
      if (res.ok) {
        const data = await res.json();
        setStressTestInfo(data);
      } else if (res.status === 401) {
        setStressTestError('Vui lòng đăng nhập để sử dụng tính năng này');
      } else {
        const data = await res.json();
        setStressTestError(data.error || 'Không thể tải thông tin stress test');
      }
    } catch (error) {
      clientLogger.error('Error fetching stress test info:', error);
      setStressTestError('Lỗi kết nối đến server');
    } finally {
      setStressTestFetching(false);
    }
  };

  const runStressTestImport = async () => {
    if (!confirm('Bạn có chắc muốn import dữ liệu stress test? Quá trình này có thể mất vài phút.')) return;

    setStressTestLoading(true);
    setStressTestResult(null);

    try {
      const res = await fetch('/api/excel/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: ['all'] }),
      });

      const data = await res.json();
      setStressTestResult(data);

      if (data.success) {
        fetchStressTestInfo(); // Refresh counts
      }
    } catch (error) {
      setStressTestResult({
        success: false,
        message: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      });
    } finally {
      setStressTestLoading(false);
    }
  };

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
      clientLogger.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-danger-600" />;
      case "processing":
        return <Clock className="w-4 h-4 text-primary-600 animate-spin" />;
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
          className="flex items-center gap-4 p-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Import Data</h3>
            <p className="text-primary-100 text-sm">Upload Excel or CSV files</p>
          </div>
          <ArrowRight className="w-5 h-5 ml-auto" />
        </Link>

        <Link
          href="/excel/export"
          className="flex items-center gap-4 p-6 bg-gradient-to-br from-success-500 to-success-600 text-white rounded-xl hover:from-success-600 hover:to-success-700 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Export Data</h3>
            <p className="text-success-100 text-sm">Download data as Excel</p>
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

      {/* Stress Test Data Section */}
      <div className="bg-gradient-to-br from-orange-50 to-warning-50 dark:from-orange-900/20 dark:to-warning-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Stress Test Data
              </h2>
              <p className="text-gray-600 dark:text-neutral-400 text-sm mt-1">
                Load sample data for testing (1 năm vận hành 2024)
              </p>
            </div>
          </div>
          <button
            onClick={runStressTestImport}
            disabled={!stressTestInfo?.fileExists || stressTestLoading || stressTestFetching}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              stressTestInfo?.fileExists && !stressTestLoading && !stressTestFetching
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {stressTestLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Import Data
              </>
            )}
          </button>
        </div>

        {/* Loading State */}
        {stressTestFetching && (
          <div className="mt-4 p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            <span className="text-gray-600 dark:text-neutral-400">Đang tải thông tin stress test...</span>
          </div>
        )}

        {/* Error State */}
        {stressTestError && !stressTestFetching && (
          <div className="mt-4 p-4 bg-danger-100 dark:bg-danger-900/30 rounded-lg text-danger-800 dark:text-danger-200 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {stressTestError}
          </div>
        )}

        {/* File Info */}
        {stressTestInfo?.fileExists && stressTestInfo.fileInfo && (
          <div className="mt-4 p-4 bg-white/50 dark:bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-400 mb-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="font-medium">{stressTestInfo.fileInfo.fileName}</span>
              <span>({(stressTestInfo.fileInfo.fileSize / 1024 / 1024).toFixed(1)} MB)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stressTestInfo.fileInfo.sheets.map(sheet => (
                <span
                  key={sheet.name}
                  className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs"
                >
                  {sheet.name}: {sheet.rowCount.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        {stressTestInfo && !stressTestInfo.fileExists && (
          <div className="mt-4 p-4 bg-warning-100 dark:bg-warning-900/30 rounded-lg text-warning-800 dark:text-warning-200 text-sm">
            File stress test chưa có. Vui lòng copy file RTR_MRP_StressTest_2024.xls vào thư mục data/
          </div>
        )}

        {/* Current Database Stats */}
        {stressTestInfo && (
          <div className="mt-4 grid grid-cols-3 md:grid-cols-7 gap-2">
            {[
              { label: 'Suppliers', count: stressTestInfo.currentData.suppliers },
              { label: 'Parts', count: stressTestInfo.currentData.parts },
              { label: 'Customers', count: stressTestInfo.currentData.customers },
              { label: 'Sales Orders', count: stressTestInfo.currentData.salesOrders },
              { label: 'POs', count: stressTestInfo.currentData.purchaseOrders },
              { label: 'Work Orders', count: stressTestInfo.currentData.workOrders },
              { label: 'NCRs', count: stressTestInfo.currentData.ncrs },
            ].map(item => (
              <div key={item.label} className="text-center p-2 bg-white/50 dark:bg-neutral-800/50 rounded">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {item.count.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-neutral-400">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Import Result */}
        {stressTestResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            stressTestResult.success
              ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200'
              : 'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-200'
          }`}>
            <div className="flex items-center gap-2 font-medium">
              {stressTestResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {stressTestResult.message}
            </div>
            {stressTestResult.results && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(stressTestResult.results).map(([entity, stats]) => (
                  <span key={entity} className="text-xs px-2 py-1 bg-white/50 rounded">
                    {entity}: {stats.processed} ✓ {stats.errors > 0 && `/ ${stats.errors} ✗`}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Imports */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Imports</h2>
            <Link
              href="/excel/import"
              className="text-sm text-primary-600 hover:underline"
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
                  className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
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
                    <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
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
              className="text-sm text-primary-600 hover:underline"
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
                  className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
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
                    <div className="w-10 h-10 rounded-lg bg-success-50 dark:bg-success-900/30 flex items-center justify-center text-success-600 dark:text-success-400">
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
