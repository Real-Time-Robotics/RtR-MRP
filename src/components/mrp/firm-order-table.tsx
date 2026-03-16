"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock, Edit, Trash2, Plus, Package } from "lucide-react";
import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import { EntityTooltip } from "@/components/entity-tooltip";
import { format } from "date-fns";
import { DataTable, Column } from "@/components/ui-v2/data-table";

interface PlannedOrder {
  id: string;
  orderNumber: string;
  partId: string;
  quantity: number;
  dueDate: Date;
  orderType: string;
  status: string;
  isFirm: boolean;
  firmDate?: Date | null;
  notes?: string | null;
  part?: {
    partNumber: string;
    name: string;
  };
}

interface FirmOrderTableProps {
  orders: PlannedOrder[];
  onFirm?: (orderId: string, firm: boolean) => void;
  onEdit?: (orderId: string, data: { quantity?: number; dueDate?: Date; notes?: string }) => void;
  onDelete?: (orderId: string) => void;
  onCreate?: (data: { partId: string; quantity: number; dueDate: Date; isFirm: boolean; notes?: string }) => void;
  parts?: Array<{ id: string; partNumber: string; name: string }>;
}

export function FirmOrderTable({
  orders,
  onFirm,
  onEdit,
  onDelete,
  onCreate,
  parts = [],
}: FirmOrderTableProps) {
  const [editOrder, setEditOrder] = useState<PlannedOrder | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createData, setCreateData] = useState({
    partId: "",
    quantity: 0,
    dueDate: new Date().toISOString().split("T")[0],
    isFirm: true,
    notes: "",
  });

  const handleEdit = () => {
    if (!editOrder || !onEdit) return;
    onEdit(editOrder.id, {
      quantity: editOrder.quantity,
      dueDate: new Date(editOrder.dueDate),
      notes: editOrder.notes || undefined,
    });
    setEditOrder(null);
  };

  const handleCreate = () => {
    if (!onCreate || !createData.partId) return;
    onCreate({
      partId: createData.partId,
      quantity: createData.quantity,
      dueDate: new Date(createData.dueDate),
      isFirm: createData.isFirm,
      notes: createData.notes || undefined,
    });
    setShowCreateDialog(false);
    setCreateData({
      partId: "",
      quantity: 0,
      dueDate: new Date().toISOString().split("T")[0],
      isFirm: true,
      notes: "",
    });
  };

  const firmCount = orders.filter((o) => o.isFirm).length;
  const plannedCount = orders.filter((o) => !o.isFirm).length;

  // Column definitions for DataTable
  const columns: Column<PlannedOrder>[] = useMemo(() => [
    {
      key: 'orderNumber',
      header: 'Order #',
      width: '100px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'part',
      header: 'Part',
      width: '150px',
      render: (value, row) => (
        <EntityTooltip type="part" id={row.partId}>
          <div className="cursor-help">
            <div>{value?.partNumber || row.partId}</div>
            {value?.name && (
              <div className="text-xs text-muted-foreground">{value.name}</div>
            )}
          </div>
        </EntityTooltip>
      ),
    },
    {
      key: 'orderType',
      header: 'Type',
      width: '80px',
      cellClassName: () => 'bg-slate-50 dark:bg-slate-900/30',
      render: (value) => value,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      width: '80px',
      sortable: true,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      width: '110px',
      sortable: true,
      render: (value) => format(new Date(value), "MMM dd, yyyy"),
    },
    {
      key: 'status',
      header: 'Status',
      width: '90px',
      cellClassName: (row) => {
        switch (row.status) {
          case "PLANNED": return "bg-blue-50 text-blue-800";
          case "FIRM": return "bg-amber-50 text-amber-800";
          default: return "bg-gray-50 text-gray-800";
        }
      },
      render: (value) => value,
    },
    {
      key: 'isFirm',
      header: 'Firm',
      width: '60px',
      render: (value, row) => (
        onFirm ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFirm(row.id, !value)}
            title={value ? "Unfirm order" : "Firm order"}
          >
            {value ? (
              <Lock className="h-4 w-4 text-amber-600" />
            ) : (
              <Unlock className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        ) : (
          value ? <Lock className="h-4 w-4 text-amber-600" /> : <Unlock className="h-4 w-4 text-muted-foreground" />
        )
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (_, row) => (
        <div className="flex gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditOrder({ ...row })}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(row.id)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ], [onFirm, onEdit, onDelete]);

  const firmOrderStats = useMemo(() => [
    { label: 'Total Orders', value: orders.length },
    { label: 'Firm Orders', value: firmCount, color: 'text-amber-600' },
    { label: 'Planned Orders', value: plannedCount },
  ], [orders.length, firmCount, plannedCount]);

  return (
    <div className="space-y-2">
      {/* Summary - CompactStatsBar */}
      <CompactStatsBar stats={firmOrderStats} />

      {/* Orders Table */}
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardHeader className="flex flex-row items-center justify-between px-3 py-2">
          <CardTitle className="text-sm font-medium">Planned Orders</CardTitle>
          {onCreate && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Order
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={orders}
            columns={columns}
            keyField="id"
            emptyMessage="No planned orders found"
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
              sheetName: 'Firm Orders',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOrder !== null} onOpenChange={() => setEditOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Planned Order</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input value={editOrder.orderNumber} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editQty">Quantity</Label>
                <Input
                  id="editQty"
                  type="number"
                  value={editOrder.quantity}
                  onChange={(e) =>
                    setEditOrder({
                      ...editOrder,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDate">Due Date</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={new Date(editOrder.dueDate).toISOString().split("T")[0]}
                  onChange={(e) =>
                    setEditOrder({
                      ...editOrder,
                      dueDate: new Date(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editOrder.notes || ""}
                  onChange={(e) =>
                    setEditOrder({
                      ...editOrder,
                      notes: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Planned Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="createPart">Part *</Label>
              <select
                id="createPart"
                className="w-full border rounded-md p-2"
                value={createData.partId}
                onChange={(e) =>
                  setCreateData({ ...createData, partId: e.target.value })
                }
              >
                <option value="">Select a part...</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.partNumber} - {part.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="createQty">Quantity *</Label>
              <Input
                id="createQty"
                type="number"
                value={createData.quantity}
                onChange={(e) =>
                  setCreateData({
                    ...createData,
                    quantity: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createDate">Due Date *</Label>
              <Input
                id="createDate"
                type="date"
                value={createData.dueDate}
                onChange={(e) =>
                  setCreateData({ ...createData, dueDate: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createFirm"
                checked={createData.isFirm}
                onChange={(e) =>
                  setCreateData({ ...createData, isFirm: e.target.checked })
                }
              />
              <Label htmlFor="createFirm">Create as Firm Order</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="createNotes">Notes</Label>
              <Textarea
                id="createNotes"
                value={createData.notes}
                onChange={(e) =>
                  setCreateData({ ...createData, notes: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!createData.partId}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
