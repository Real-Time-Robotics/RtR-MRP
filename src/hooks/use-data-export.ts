
import { useCallback } from 'react';
import * as XLSX from 'xlsx';

interface UseDataExportOptions {
    fileName?: string;
    sheetName?: string;
}

/**
 * Hook to export JSON data to Excel/CSV instantly.
 */
export function useDataExport() {

    const exportToExcel = useCallback((data: any[], options?: UseDataExportOptions) => {
        if (!data || data.length === 0) {
            console.warn("Export called with no data");
            return;
        }

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
