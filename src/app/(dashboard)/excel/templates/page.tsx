"use client";

// src/app/(dashboard)/excel/templates/page.tsx
// Templates Download Page

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Package,
  Truck,
  Box,
  Users,
  Warehouse,
  Layers,
  CheckCircle,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clientLogger } from '@/lib/client-logger';

interface Template {
  type: string;
  name: string;
  description: string;
  icon: string;
  downloadCount: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Package,
  Truck,
  Box,
  Users,
  Warehouse,
  Layers,
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/excel/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      clientLogger.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: string) => {
    setDownloading(type);
    setDownloaded(null);

    try {
      const response = await fetch(
        `/api/excel/templates?type=${type}&download=true`
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const fileName = `${type}_import_template.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setDownloaded(type);
      setTimeout(() => setDownloaded(null), 3000);

      // Update download count
      setTemplates((prev) =>
        prev.map((t) =>
          t.type === type ? { ...t, downloadCount: t.downloadCount + 1 } : t
        )
      );
    } catch (error) {
      clientLogger.error("Download error:", error);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || FileSpreadsheet;
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
          <h1 className="text-2xl font-bold text-gray-900">Import Templates</h1>
          <p className="text-gray-500 mt-1">
            Download pre-formatted templates for importing data
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">How to use templates</p>
          <p className="mt-1">
            Download a template, fill in your data following the column headers,
            and use the Import Wizard to upload your file.
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border p-6 animate-pulse"
            >
              <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full mb-4" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          ))
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No templates available</p>
          </div>
        ) : (
          templates.map((template) => {
            const Icon = getIcon(template.icon);
            const isDownloading = downloading === template.type;
            const isDownloaded = downloaded === template.type;

            return (
              <div
                key={template.type}
                className="bg-white rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 mb-4">
                  <Icon className="w-6 h-6" />
                </div>

                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  {template.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {template.downloadCount} downloads
                  </span>

                  <button
                    onClick={() => handleDownload(template.type)}
                    disabled={isDownloading}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isDownloaded
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    )}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Downloading...
                      </>
                    ) : isDownloaded ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Template Guidelines */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Template Guidelines</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-800 mb-2">Required Fields</h3>
            <p className="text-sm text-gray-600">
              Fields marked with an asterisk (*) in the template are required.
              Make sure to fill in all required fields before importing.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-2">Data Formats</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- Dates: YYYY-MM-DD format</li>
              <li>- Numbers: Use decimal point, not comma</li>
              <li>- Boolean: true/false or yes/no</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-2">Sample Data</h3>
            <p className="text-sm text-gray-600">
              Each template includes one sample row showing the expected format.
              Delete this row before importing your own data.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-800 mb-2">Column Order</h3>
            <p className="text-sm text-gray-600">
              Column order does not matter. The import wizard will let you map
              columns to the correct fields.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/excel/import"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Go to Import Wizard
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/excel"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Back to Excel Hub
        </Link>
      </div>
    </div>
  );
}
