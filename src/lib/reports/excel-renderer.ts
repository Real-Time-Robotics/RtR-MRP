// src/lib/reports/excel-renderer.ts
// Render report data to Excel using xlsx

import * as XLSX from 'xlsx';
import { ReportData } from './report-generator';

export function renderToExcel(data: ReportData): Buffer {
  const workbook = XLSX.utils.book_new();

  // --- Data sheet ---
  const headers = data.template.columns.map((col) => col.labelVi);

  const rows = data.rows.map((row) =>
    data.template.columns.map((col) => {
      let value = row[col.key];

      if (col.type === 'date' && value) {
        value = new Date(value as string).toLocaleDateString('vi-VN');
      }

      return value ?? '';
    })
  );

  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths based on content
  worksheet['!cols'] = data.template.columns.map((col) => ({
    wch: Math.max(col.labelVi.length + 2, 12),
  }));

  const sheetName = data.template.nameVi.slice(0, 31); // Excel max 31 chars
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // --- Summary sheet ---
  const summaryData = [
    ['Bao cao', data.template.nameVi],
    ['Ngay tao', data.generatedAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })],
    ['Tong dong', data.summary.totalRows],
    [],
    ...data.summary.highlights.map((h) => [h.label, h.value]),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tom tat');

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}
