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
import { formatCurrency } from '@/lib/currency';

interface SalesOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  requiredDate: string;
  priority: string;
  status: string;
  totalAmount: number;
  notes?: string;
  customer?: {
    name: string;
    code?: string;
  };
  lines?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface SOExportButtonProps {
  salesOrders: SalesOrder[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SOExportButton({ salesOrders, variant = 'outline', size = 'sm' }: SOExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const columns: ExportColumn<SalesOrder>[] = [
    { key: 'orderNumber', header: 'Order Number', width: 12 },
    { key: 'customer', header: 'Customer', width: 25, format: (v) => (v as { name?: string })?.name || '-' },
    { key: 'customerCode', header: 'Customer Code', width: 12, format: (_, row) => (row as SalesOrder).customer?.code || '-' },
    { key: 'orderDate', header: 'Order Date', width: 12, type: 'date' },
    { key: 'requiredDate', header: 'Required Date', width: 12, type: 'date' },
    { key: 'priority', header: 'Priority', width: 10, format: (v) => { const s = v as string; return s ? s.charAt(0).toUpperCase() + s.slice(1) : '-'; } },
    { key: 'linesCount', header: 'Items', width: 8, type: 'number', align: 'center', format: (_, row) => String((row as SalesOrder).lines?.length || 0) },
    { key: 'totalAmount', header: 'Total Amount', width: 15, type: 'currency', align: 'right' },
    { key: 'status', header: 'Status', width: 12, format: (v) => (v as string)?.replace('_', ' ').toUpperCase() || '-' },
    { key: 'notes', header: 'Notes', width: 30, format: (v) => (v as string) || '' },
  ];

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const totalValue = salesOrders.reduce((sum, so) => sum + (so.totalAmount || 0), 0);
      exportToExcel(salesOrders, columns, {
        title: 'Sales Orders Report',
        filename: 'sales-orders',
        sheetName: 'Sales Orders',
      }, [
        ['Total Sales Orders', salesOrders.length.toString()],
        ['Total Value', formatCurrency(totalValue)],
        ['In Progress', salesOrders.filter(so => so.status === 'in_progress').length.toString()],
        ['Pending', salesOrders.filter(so => so.status === 'pending').length.toString()],
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const totalValue = salesOrders.reduce((sum, so) => sum + (so.totalAmount || 0), 0);
      exportToPDF(salesOrders, columns, {
        title: 'Sales Orders Report',
        subtitle: `Total: ${salesOrders.length} orders | Value: ${formatCurrency(totalValue)}`,
        filename: 'sales-orders',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting || salesOrders.length === 0}>
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
