"use client";

// src/app/(dashboard)/excel/import/page.tsx
// Import Wizard Page

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImportWizard } from "@/components/excel";

export default function ImportPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
          <p className="text-gray-500 mt-1">
            Upload and import data from Excel or CSV files
          </p>
        </div>
      </div>

      {/* Import Wizard */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <ImportWizard />
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Import Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            - Make sure your file has headers in the first row
          </li>
          <li>
            - Use the provided templates for best results
          </li>
          <li>
            - Required fields must be mapped before import
          </li>
          <li>
            - Use upsert mode to update existing records
          </li>
          <li>
            - Review the preview data before final import
          </li>
        </ul>
        <div className="mt-4">
          <Link
            href="/excel/templates"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            Download import templates
          </Link>
        </div>
      </div>
    </div>
  );
}
