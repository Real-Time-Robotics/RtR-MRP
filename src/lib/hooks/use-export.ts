// =============================================================================
// USE EXPORT HOOK
// React hook for export functionality
// =============================================================================

'use client';

import { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';
export type ExportEntity = 
  | 'sales-orders' 
  | 'parts' 
  | 'inventory' 
  | 'suppliers' 
  | 'customers' 
  | 'work-orders' 
  | 'quality-records'
  | 'mrp-results';

export interface ExportOptions {
  format: ExportFormat;
  entity: ExportEntity;
  title?: string;
  filters?: Record<string, any>;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  data: string; // Base64 encoded
  mimeType: string;
  size: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function downloadFile(base64Data: string, filename: string, mimeType: string): void {
  // Decode base64
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Create blob and download
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
}

// =============================================================================
// HOOK
// =============================================================================

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{ filename: string; timestamp: Date } | null>(null);

  const exportData = useCallback(async (options: ExportOptions): Promise<boolean> => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      const exportResult: ExportResult = result.data;

      // Download the file
      downloadFile(exportResult.data, exportResult.filename, exportResult.mimeType);

      setLastExport({
        filename: exportResult.filename,
        timestamp: new Date(),
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Quick export functions
  const exportSalesOrders = useCallback((format: ExportFormat = 'xlsx') => {
    return exportData({ format, entity: 'sales-orders', title: 'Danh sách đơn hàng' });
  }, [exportData]);

  const exportParts = useCallback((format: ExportFormat = 'xlsx') => {
    return exportData({ format, entity: 'parts', title: 'Danh mục vật tư' });
  }, [exportData]);

  const exportInventory = useCallback((format: ExportFormat = 'xlsx') => {
    return exportData({ format, entity: 'inventory', title: 'Báo cáo tồn kho' });
  }, [exportData]);

  const exportSuppliers = useCallback((format: ExportFormat = 'xlsx') => {
    return exportData({ format, entity: 'suppliers', title: 'Danh sách nhà cung cấp' });
  }, [exportData]);

  const exportCustomers = useCallback((format: ExportFormat = 'xlsx') => {
    return exportData({ format, entity: 'customers', title: 'Danh sách khách hàng' });
  }, [exportData]);

  const exportWorkOrders = useCallback((format: ExportFormat = 'xlsx') => {
    return exportData({ format, entity: 'work-orders', title: 'Danh sách lệnh sản xuất' });
  }, [exportData]);

  const exportQualityRecords = useCallback((format: ExportFormat = 'xlsx') => {
    return exportData({ format, entity: 'quality-records', title: 'Báo cáo chất lượng' });
  }, [exportData]);

  return {
    isExporting,
    error,
    lastExport,
    exportData,
    exportSalesOrders,
    exportParts,
    exportInventory,
    exportSuppliers,
    exportCustomers,
    exportWorkOrders,
    exportQualityRecords,
  };
}

export default useExport;
