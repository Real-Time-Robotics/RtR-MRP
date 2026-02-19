"use client";

// src/app/(dashboard)/excel/import/page.tsx
// Import Wizard Page with AI Integration

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Sparkles } from "lucide-react";

// Lazy-load ImportWizard (~858 lines, imports xlsx library)
const ImportWizard = dynamic(
  () => import("@/components/excel/import-wizard").then(mod => mod.ImportWizard),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-96 rounded-lg" />,
  }
);

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
          <h1 className="text-2xl font-bold text-gray-900">Import dữ liệu</h1>
          <p className="text-gray-500 mt-1">
            Tải lên và import dữ liệu từ file Excel hoặc CSV
          </p>
        </div>
      </div>

      {/* AI Feature Badge */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-primary-50 border border-purple-200 rounded-lg w-fit">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <span className="text-sm text-purple-800">
          <strong>AI Smart Import:</strong> Tự động nhận diện tiếng Việt, đề xuất mapping thông minh, phát hiện trùng lặp
        </span>
      </div>

      {/* Import Wizard */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <ImportWizard />
      </div>

      {/* Help Section */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
        <h3 className="font-semibold text-primary-900 mb-2">Hướng dẫn Import</h3>
        <ul className="text-sm text-primary-800 space-y-1">
          <li>
            - Đảm bảo file có headers ở dòng đầu tiên
          </li>
          <li>
            - Sử dụng template chuẩn để đạt kết quả tốt nhất
          </li>
          <li>
            - Các trường bắt buộc phải được mapping trước khi import
          </li>
          <li>
            - Sử dụng chế độ upsert để cập nhật bản ghi đã tồn tại
          </li>
          <li>
            - Kiểm tra dữ liệu preview trước khi import chính thức
          </li>
          <li>
            - <strong>Hỗ trợ headers tiếng Việt:</strong> Mã SP, Tên, Đơn giá, Số lượng...
          </li>
        </ul>
        <div className="mt-4">
          <Link
            href="/excel/templates"
            className="text-primary-600 hover:underline text-sm font-medium"
          >
            Tải templates import mẫu
          </Link>
        </div>
      </div>
    </div>
  );
}
