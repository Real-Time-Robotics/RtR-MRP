'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToExcel, exportToPDF, ExportColumn } from '@/lib/export';
import { formatDate } from '@/lib/date';

interface WorkOrder {
  id: string;
  woNumber: string;
  quantity: number;
  priority: string;
  status: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  completedQty: number;
  scrapQty?: number;
  product: {
    sku: string;
    name: string;
  };
  salesOrder?: {
    orderNumber: string;
    customer: {
      name: string;
    };
  } | null;
}

interface WOExportButtonProps {
  workOrders: WorkOrder[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function WOExportButton({ workOrders, variant = 'outline', size = 'sm' }: WOExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const columns: ExportColumn<WorkOrder>[] = [
    { key: 'woNumber', header: 'WO Number', width: 12 },
    { key: 'product', header: 'Product', width: 25, format: (v) => (v as { name?: string })?.name || '-' },
    { key: 'productSku', header: 'SKU', width: 15, format: (_, row) => (row as WorkOrder).product?.sku || '-' },
    { key: 'quantity', header: 'Qty', width: 8, type: 'number', align: 'right' },
    { key: 'completedQty', header: 'Completed', width: 10, type: 'number', align: 'right' },
    { key: 'priority', header: 'Priority', width: 10, format: (v) => { const s = v as string; return s ? s.charAt(0).toUpperCase() + s.slice(1) : '-'; } },
    { key: 'plannedStart', header: 'Start Date', width: 12, type: 'date' },
    { key: 'plannedEnd', header: 'Due Date', width: 12, type: 'date' },
    { key: 'status', header: 'Status', width: 12, format: (v) => (v as string)?.replace('_', ' ').toUpperCase() || '-' },
    { key: 'salesOrder', header: 'Sales Order', width: 12, format: (v) => (v as { orderNumber?: string })?.orderNumber || '-' },
    { key: 'customer', header: 'Customer', width: 20, format: (_, row) => (row as WorkOrder).salesOrder?.customer?.name || '-' },
  ];

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportToExcel(workOrders, columns, {
        title: 'Work Orders Report',
        filename: 'work-orders',
        sheetName: 'Work Orders',
      }, [
        ['Total Work Orders', workOrders.length.toString()],
        ['Total Quantity', workOrders.reduce((sum, wo) => sum + wo.quantity, 0).toString()],
        ['Total Completed', workOrders.reduce((sum, wo) => sum + wo.completedQty, 0).toString()],
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      exportToPDF(workOrders, columns, {
        title: 'Work Orders Report',
        subtitle: `Total: ${workOrders.length} work orders`,
        filename: 'work-orders',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting || workOrders.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
