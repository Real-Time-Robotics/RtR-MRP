"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteSelector } from "@/components/mrp/site-selector";
import {
  Loader2,
  Plus,
  MapPin,
  ArrowRightLeft,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from '@/lib/client-logger';

interface Site {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  type: string;
  isActive: boolean;
  warehouses?: Array<{ id: string; name: string }>;
}

interface TransferOrder {
  id: string;
  transferNumber: string;
  fromSite: { name: string };
  toSite: { name: string };
  status: string;
  requestedDate: Date;
  expectedDate?: Date;
  lines: Array<{
    id: string;
    part: { partNumber: string; name: string };
    quantity: number;
    shippedQty: number;
    receivedQty: number;
  }>;
}

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

export default function MultiSitePage() {
  const { toast } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateSiteDialog, setShowCreateSiteDialog] = useState(false);
  const [showCreateTransferDialog, setShowCreateTransferDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("sites");

  const [newSite, setNewSite] = useState({
    code: "",
    name: "",
    address: "",
    type: "WAREHOUSE",
  });

  const [newTransfer, setNewTransfer] = useState({
    fromSiteId: "",
    toSiteId: "",
    requestedDate: new Date().toISOString().split("T")[0],
    lines: [{ partId: "", quantity: 0 }],
  });

  useEffect(() => {
    fetchSites();
    fetchTransfers();
    fetchParts();
  }, []);

  const fetchSites = async () => {
    try {
      const response = await fetch("/api/mrp/multi-site?action=sites");
      if (response.ok) {
        const data = await response.json();
        setSites(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch sites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      const response = await fetch("/api/mrp/multi-site/transfers");
      if (response.ok) {
        const data = await response.json();
        setTransfers(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch transfers:", error);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await fetch("/api/parts?limit=500");
      if (response.ok) {
        const data = await response.json();
        setParts(data);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch parts:", error);
    }
  };

  const handleCreateSite = async () => {
    try {
      const response = await fetch("/api/mrp/multi-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createSite", ...newSite }),
      });

      if (response.ok) {
        toast({ title: "Site created successfully" });
        fetchSites();
        setShowCreateSiteDialog(false);
        setNewSite({ code: "", name: "", address: "", type: "WAREHOUSE" });
      } else {
        throw new Error("Failed to create site");
      }
    } catch (error) {
      clientLogger.error("Failed to create site:", error);
      toast({ title: "Failed to create site", variant: "destructive" });
    }
  };

  const handleCreateTransfer = async () => {
    try {
      const validLines = newTransfer.lines.filter(
        (l) => l.partId && l.quantity > 0
      );
      if (validLines.length === 0) {
        toast({ title: "Please add at least one line item", variant: "destructive" });
        return;
      }

      const response = await fetch("/api/mrp/multi-site/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromSiteId: newTransfer.fromSiteId,
          toSiteId: newTransfer.toSiteId,
          requestedDate: newTransfer.requestedDate,
          lines: validLines,
        }),
      });

      if (response.ok) {
        toast({ title: "Transfer order created" });
        fetchTransfers();
        setShowCreateTransferDialog(false);
        setNewTransfer({
          fromSiteId: "",
          toSiteId: "",
          requestedDate: new Date().toISOString().split("T")[0],
          lines: [{ partId: "", quantity: 0 }],
        });
      } else {
        throw new Error("Failed to create transfer");
      }
    } catch (error) {
      clientLogger.error("Failed to create transfer:", error);
      toast({ title: "Failed to create transfer order", variant: "destructive" });
    }
  };

  const addTransferLine = () => {
    setNewTransfer({
      ...newTransfer,
      lines: [...newTransfer.lines, { partId: "", quantity: 0 }],
    });
  };

  const removeTransferLine = (index: number) => {
    setNewTransfer({
      ...newTransfer,
      lines: newTransfer.lines.filter((_, i) => i !== index),
    });
  };

  const updateTransferLine = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...newTransfer.lines];
    (updated[index] as Record<string, unknown>)[field] = value;
    setNewTransfer({ ...newTransfer, lines: updated });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "IN_TRANSIT":
        return "bg-yellow-100 text-yellow-800";
      case "RECEIVED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multi-Site Planning</h1>
          <p className="text-muted-foreground">
            Manage sites and inter-site transfers
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sites" className="gap-2">
            <MapPin className="h-4 w-4" />
            Sites
          </TabsTrigger>
          <TabsTrigger value="transfers" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transfers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateSiteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </div>

          <SiteSelector
            sites={sites}
            selectedSiteId={selectedSiteId}
            onSelect={setSelectedSiteId}
          />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateTransferDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transfer Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer #</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">
                        {transfer.transferNumber}
                      </TableCell>
                      <TableCell>
                        {transfer.fromSite.name} → {transfer.toSite.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transfer.lines.length} item(s)
                          <div className="text-xs text-muted-foreground">
                            {transfer.lines
                              .slice(0, 2)
                              .map((l) => l.part.partNumber)
                              .join(", ")}
                            {transfer.lines.length > 2 && "..."}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(transfer.requestedDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transfer.status)}>
                          {transfer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {transfers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No transfer orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Site Dialog */}
      <Dialog open={showCreateSiteDialog} onOpenChange={setShowCreateSiteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Site</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteCode">Site Code *</Label>
                <Input
                  id="siteCode"
                  value={newSite.code}
                  onChange={(e) =>
                    setNewSite({ ...newSite, code: e.target.value })
                  }
                  placeholder="SITE001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteType">Type</Label>
                <Select
                  value={newSite.type}
                  onValueChange={(v) => setNewSite({ ...newSite, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                    <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
                    <SelectItem value="DISTRIBUTION">Distribution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name *</Label>
              <Input
                id="siteName"
                value={newSite.name}
                onChange={(e) =>
                  setNewSite({ ...newSite, name: e.target.value })
                }
                placeholder="Main Warehouse"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteAddress">Address</Label>
              <Input
                id="siteAddress"
                value={newSite.address}
                onChange={(e) =>
                  setNewSite({ ...newSite, address: e.target.value })
                }
                placeholder="123 Industrial Ave, City, State"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSiteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSite}
              disabled={!newSite.code || !newSite.name}
            >
              Create Site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Transfer Dialog */}
      <Dialog
        open={showCreateTransferDialog}
        onOpenChange={setShowCreateTransferDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Transfer Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>From Site *</Label>
                <Select
                  value={newTransfer.fromSiteId}
                  onValueChange={(v) =>
                    setNewTransfer({ ...newTransfer, fromSiteId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Site *</Label>
                <Select
                  value={newTransfer.toSiteId}
                  onValueChange={(v) =>
                    setNewTransfer({ ...newTransfer, toSiteId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sites
                      .filter((s) => s.id !== newTransfer.fromSiteId)
                      .map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Requested Date</Label>
                <Input
                  type="date"
                  value={newTransfer.requestedDate}
                  onChange={(e) =>
                    setNewTransfer({
                      ...newTransfer,
                      requestedDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button variant="outline" size="sm" onClick={addTransferLine}>
                  <Plus className="h-4 w-4 mr-1" /> Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {newTransfer.lines.map((line, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={line.partId}
                      onValueChange={(v) =>
                        updateTransferLine(index, "partId", v)
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select part..." />
                      </SelectTrigger>
                      <SelectContent>
                        {parts.map((part) => (
                          <SelectItem key={part.id} value={part.id}>
                            {part.partNumber} - {part.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={line.quantity}
                      onChange={(e) =>
                        updateTransferLine(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="Qty"
                      className="w-[100px]"
                    />
                    {newTransfer.lines.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTransferLine(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateTransferDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTransfer}
              disabled={!newTransfer.fromSiteId || !newTransfer.toSiteId}
            >
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
