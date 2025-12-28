"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { format } from "date-fns";

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

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-3xl font-bold">{orders.length}</div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Lock className="h-8 w-8 text-amber-600" />
              <div>
                <div className="text-3xl font-bold text-amber-700">{firmCount}</div>
                <div className="text-sm text-amber-600">Firm Orders</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Unlock className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="text-3xl font-bold">{plannedCount}</div>
                <div className="text-sm text-muted-foreground">Planned Orders</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Planned Orders</CardTitle>
          {onCreate && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Order
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Part</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Firm</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className={order.isFirm ? "bg-amber-50/50" : ""}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    {order.part?.partNumber || order.partId}
                    {order.part?.name && (
                      <div className="text-xs text-muted-foreground">{order.part.name}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.orderType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{order.quantity}</TableCell>
                  <TableCell>{format(new Date(order.dueDate), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        order.status === "PLANNED"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "FIRM"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {onFirm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFirm(order.id, !order.isFirm)}
                        title={order.isFirm ? "Unfirm order" : "Firm order"}
                      >
                        {order.isFirm ? (
                          <Lock className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Unlock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditOrder({ ...order })}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(order.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No planned orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
