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

interface PurchaseOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  expectedDate: string;
  status: string;
  totalAmount: number;
  notes?: string;
  supplier?: {
    name: string;
    code?: string;
  };
  lines?: Array<{
    partId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface POExportButtonProps {
  purchaseOrders: PurchaseOrder[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function POExportButton({ purchaseOrders, variant = 'outline', size = 'sm' }: POExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const columns: ExportColumn<PurchaseOrder>[] = [
    { key: 'poNumber', header: 'PO Number', width: 12 },
    { key: 'supplier', header: 'Supplier', width: 25, format: (v) => (v as { name?: string })?.name || '-' },
    { key: 'supplierCode', header: 'Supplier Code', width: 12, format: (_, row) => (row as PurchaseOrder).supplier?.code || '-' },
    { key: 'orderDate', header: 'Order Date', width: 12, type: 'date' },
    { key: 'expectedDate', header: 'Expected Date', width: 12, type: 'date' },
    { key: 'linesCount', header: 'Items', width: 8, type: 'number', align: 'center', format: (_, row) => String(row.lines?.length || 0) },
    { key: 'totalAmount', header: 'Total Amount', width: 15, type: 'currency', align: 'right' },
    { key: 'status', header: 'Status', width: 12, format: (v) => (v as string)?.replace('_', ' ').toUpperCase() || '-' },
    { key: 'notes', header: 'Notes', width: 30, format: (v) => (v as string) || '' },
  ];

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const totalValue = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
      exportToExcel(purchaseOrders, columns, {
        title: 'Purchase Orders Report',
        filename: 'purchase-orders',
        sheetName: 'Purchase Orders',
      }, [
        ['Total Purchase Orders', purchaseOrders.length.toString()],
        ['Total Value', formatCurrency(totalValue)],
        ['Pending Orders', purchaseOrders.filter(po => !['received', 'cancelled'].includes(po.status)).length.toString()],
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const totalValue = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
      exportToPDF(purchaseOrders, columns, {
        title: 'Purchase Orders Report',
        subtitle: `Total: ${purchaseOrders.length} orders | Value: ${formatCurrency(totalValue)}`,
        filename: 'purchase-orders',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting || purchaseOrders.length === 0}>
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
