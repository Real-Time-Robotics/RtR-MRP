
import { useCallback } from 'react';
import { clientLogger } from '@/lib/client-logger';

interface UseDataExportOptions {
    fileName?: string;
    sheetName?: string;
}

/**
 * Hook to export JSON data to Excel/CSV instantly.
 * Uses dynamic import for xlsx (~1MB) to avoid loading it in the initial bundle.
 */
export function useDataExport() {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- XLSX.utils.json_to_sheet accepts any object array
    const exportToExcel = useCallback(async (data: Record<string, any>[], options?: UseDataExportOptions) => {
        if (!data || data.length === 0) {
            clientLogger.warn("Export called with no data");
            return;
        }

        // Dynamically import xlsx only when export is triggered
        const XLSX = await import('xlsx');

        const fileName = (options?.fileName || 'export') + `_${new Date().toISOString().split('T')[0]}.xlsx`;
        const sheetName = options?.sheetName || 'Data';

        // create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Save file
        XLSX.writeFile(workbook, fileName);
    }, []);

    return {
        exportToExcel
    };
}
