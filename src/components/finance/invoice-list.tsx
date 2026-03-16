"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, CreditCard, Search } from "lucide-react";
import { format } from "date-fns";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { EntityTooltip } from "@/components/entity-tooltip";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  customer?: { id?: string; code: string; name: string };
  supplier?: { id?: string; code: string; name: string };
}

interface InvoiceListProps {
  invoices: Invoice[];
  type: "sales" | "purchase";
  onView: (id: string) => void;
  onRecordPayment: (id: string) => void;
}

export function InvoiceList({
  invoices,
  type,
  onView,
  onRecordPayment,
}: InvoiceListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (invoice.customer?.name || invoice.supplier?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const entityLabel = type === "sales" ? "Customer" : "Supplier";

  // Column definitions for DataTable
  const columns: Column<Invoice>[] = useMemo(() => [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      width: '120px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'entity',
      header: entityLabel,
      width: '150px',
      render: (_, row) => {
        const entity = row.customer || row.supplier;
        const tooltipType = row.customer ? 'customer' as const : 'supplier' as const;
        if (entity?.id) {
          return (
            <EntityTooltip type={tooltipType} id={entity.id}>
              <span className="cursor-help">{entity.name}</span>
            </EntityTooltip>
          );
        }
        return entity?.name || "-";
      },
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      width: '100px',
      sortable: true,
      render: (value) => format(new Date(value), "MMM d, yyyy"),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      width: '100px',
      sortable: true,
      render: (value) => format(new Date(value), "MMM d, yyyy"),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      sortable: true,
      cellClassName: (row) => {
        const variants: Record<string, string> = {
          DRAFT: "bg-gray-50 text-gray-800",
          SENT: "bg-blue-50 text-blue-800",
          PENDING: "bg-yellow-50 text-yellow-800",
          APPROVED: "bg-green-50 text-green-800",
          PARTIALLY_PAID: "bg-orange-50 text-orange-800",
          PAID: "bg-green-50 text-green-800",
          OVERDUE: "bg-red-50 text-red-800",
          CANCELLED: "bg-gray-50 text-gray-800",
        };
        return variants[row.status] || "";
      },
      render: (value) => value.replace("_", " "),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      width: '100px',
      type: 'currency',
      sortable: true,
      render: (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'balance',
      header: 'Balance',
      width: '100px',
      type: 'currency',
      render: (_, row) => {
        const balance = row.totalAmount - row.paidAmount;
        return `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (_, row) => {
        const balance = row.totalAmount - row.paidAmount;
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(row.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {balance > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRecordPayment(row.id)}
              >
                <CreditCard className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [entityLabel, onView, onRecordPayment]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="relative w-48 lg:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1 px-2.5">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filteredInvoices}
        columns={columns}
        keyField="id"
        emptyMessage="No invoices found"
        pagination
        pageSize={20}
        searchable={false}
        stickyHeader
        excelMode={{
          enabled: true,
          showRowNumbers: true,
          columnHeaderStyle: 'field-names',
          gridBorders: true,
          showFooter: true,
          sheetName: 'Invoices',
          compactMode: true,
        }}
      />
    </div>
  );
}
