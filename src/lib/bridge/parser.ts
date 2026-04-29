// Bridge Layer — Excel/CSV parser
// Sprint 28 TIP-S28-09

import * as XLSX from 'xlsx';

export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export function parseExcelBuffer(buffer: Buffer, maxPreviewRows = 10): ParsedSheet[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets: ParsedSheet[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    sheets.push({
      sheetName,
      headers,
      rows: jsonData.slice(0, maxPreviewRows),
      totalRows: jsonData.length,
    });
  }

  return sheets;
}

export function parseCSVBuffer(buffer: Buffer, maxPreviewRows = 10): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0] || 'Sheet1';
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  return {
    sheetName,
    headers,
    rows: jsonData.slice(0, maxPreviewRows),
    totalRows: jsonData.length,
  };
}
