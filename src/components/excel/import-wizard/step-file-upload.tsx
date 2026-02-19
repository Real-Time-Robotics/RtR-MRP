"use client";

// src/components/excel/import-wizard/step-file-upload.tsx
// Step 1: File Upload

import { FileUpload } from "../file-upload";

interface StepFileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export function StepFileUpload({ onFileSelect, isLoading }: StepFileUploadProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Tải file lên</h3>
      <p className="text-gray-600">
        Chọn file Excel (.xlsx, .xls) hoặc CSV để import.
      </p>
      <FileUpload onFileSelect={onFileSelect} disabled={isLoading} />
    </div>
  );
}
