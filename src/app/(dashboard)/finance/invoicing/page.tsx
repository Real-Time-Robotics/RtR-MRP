"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Receipt,
  CreditCard,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceList, AgingReport } from "@/components/finance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientLogger } from '@/lib/client-logger';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  customer?: { code: string; name: string };
  supplier?: { code: string; name: string };
}

interface AgingData {
  summary: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
    total: number;
  };
  details: Array<{
    entityId: string;
    entityCode: string;
    entityName: string;
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
    total: number;
  }>;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  );
}

function InvoicingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") || "sales";

  const [tab, setTab] = useState(initialTab);
  const [salesInvoices, setSalesInvoices] = useState<Invoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<Invoice[]>([]);
  const [arAging, setArAging] = useState<AgingData | null>(null);
  const [apAging, setApAging] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [newInvoiceDialogOpen, setNewInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "CHECK",
    referenceNumber: "",
  });
  const [newInvoiceData, setNewInvoiceData] = useState({
    entityId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    totalAmount: "",
    notes: "",
  });
  const [customers, setCustomers] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const [customersRes, suppliersRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/suppliers"),
      ]);
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.data || []);
      }
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.data || []);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch entities:", error);
    }
  };

  const fetchData = async () => {
    try {
      const [salesRes, purchaseRes, arAgingRes, apAgingRes] = await Promise.all([
        fetch("/api/finance/invoices/sales"),
        fetch("/api/finance/invoices/purchase"),
        fetch("/api/finance/invoices/sales?action=aging"),
        fetch("/api/finance/invoices/purchase?action=aging"),
      ]);

      if (salesRes.ok) {
        const data = await salesRes.json();
        setSalesInvoices(
          (data.invoices || []).map((inv: Record<string, unknown>) => ({
            ...inv,
            totalAmount: Number(inv.totalAmount) || 0,
            paidAmount: Number(inv.paidAmount) || 0,
          }))
        );
      }

      if (purchaseRes.ok) {
        const data = await purchaseRes.json();
        setPurchaseInvoices(
          (data.invoices || []).map((inv: Record<string, unknown>) => ({
            ...inv,
            totalAmount: Number(inv.totalAmount) || 0,
            paidAmount: Number(inv.paidAmount) || 0,
          }))
        );
      }

      if (arAgingRes.ok) {
        setArAging(await arAgingRes.json());
      }

      if (apAgingRes.ok) {
        setApAging(await apAgingRes.json());
      }
    } catch (error) {
      clientLogger.error("Failed to fetch invoicing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (id: string) => {
    const type = tab === "sales" ? "sales" : "purchase";
    router.push(`/finance/invoicing/${type}/${id}`);
  };

  const handleRecordPayment = (id: string) => {
    const invoices = tab === "sales" ? salesInvoices : purchaseInvoices;
    const invoice = invoices.find((i) => i.id === id);
    if (invoice) {
      setSelectedInvoice(invoice);
      setPaymentData({
        paymentDate: new Date().toISOString().split("T")[0],
        amount: String(invoice.totalAmount - invoice.paidAmount),
        paymentMethod: "CHECK",
        referenceNumber: "",
      });
      setPaymentDialogOpen(true);
    }
  };

  const submitPayment = async () => {
    if (!selectedInvoice) return;

    setSubmitting(true);
    try {
      const endpoint =
        tab === "sales"
          ? "/api/finance/invoices/sales"
          : "/api/finance/invoices/purchase";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment",
          invoiceId: selectedInvoice.id,
          paymentDate: paymentData.paymentDate,
          amount: Number(paymentData.amount),
          paymentMethod: paymentData.paymentMethod,
          referenceNumber: paymentData.referenceNumber || undefined,
        }),
      });

      if (res.ok) {
        setPaymentDialogOpen(false);
        await fetchData();
      }
    } catch (error) {
      clientLogger.error("Failed to record payment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openNewInvoiceDialog = () => {
    // Calculate default due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    setNewInvoiceData({
      entityId: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: dueDate.toISOString().split("T")[0],
      totalAmount: "",
      notes: "",
    });
    setNewInvoiceDialogOpen(true);
  };

  const submitNewInvoice = async () => {
    if (!newInvoiceData.entityId || !newInvoiceData.totalAmount) return;

    setSubmitting(true);
    try {
      const endpoint = tab === "sales"
        ? "/api/finance/invoices/sales"
        : "/api/finance/invoices/purchase";

      const body = tab === "sales"
        ? {
            action: "create",
            customerId: newInvoiceData.entityId,
            invoiceDate: newInvoiceData.invoiceDate,
            dueDate: newInvoiceData.dueDate,
            totalAmount: Number(newInvoiceData.totalAmount),
            notes: newInvoiceData.notes || undefined,
          }
        : {
            action: "create",
            supplierId: newInvoiceData.entityId,
            invoiceDate: newInvoiceData.invoiceDate,
            dueDate: newInvoiceData.dueDate,
            totalAmount: Number(newInvoiceData.totalAmount),
            notes: newInvoiceData.notes || undefined,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setNewInvoiceDialogOpen(false);
        await fetchData();
      }
    } catch (error) {
      clientLogger.error("Failed to create invoice:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoicing"
        description="Sales invoices (AR) and Purchase invoices (AP)"
        actions={
          <Button onClick={openNewInvoiceDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Sales Invoices (AR)
          </TabsTrigger>
          <TabsTrigger value="purchase" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Purchase Invoices (AP)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {arAging && (
            <AgingReport
              title="Accounts Receivable Aging"
              summary={arAging.summary}
              details={arAging.details}
              entityLabel="Customer"
              entityType="customer"
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Sales Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceList
                invoices={salesInvoices}
                type="sales"
                onView={handleViewInvoice}
                onRecordPayment={handleRecordPayment}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase" className="space-y-6">
          {apAging && (
            <AgingReport
              title="Accounts Payable Aging"
              summary={apAging.summary}
              details={apAging.details}
              entityLabel="Supplier"
              entityType="supplier"
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Purchase Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceList
                invoices={purchaseInvoices}
                type="purchase"
                onView={handleViewInvoice}
                onRecordPayment={handleRecordPayment}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Ghi nhận thanh toán cho hóa đơn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Invoice</p>
              <p className="font-medium">{selectedInvoice?.invoiceNumber}</p>
              <p className="text-sm">
                Balance: $
                {(
                  (selectedInvoice?.totalAmount || 0) -
                  (selectedInvoice?.paidAmount || 0)
                ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, paymentDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, amount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={paymentData.paymentMethod}
                  onValueChange={(value) =>
                    setPaymentData({ ...paymentData, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="ACH">ACH</SelectItem>
                    <SelectItem value="WIRE">Wire Transfer</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={paymentData.referenceNumber}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      referenceNumber: e.target.value,
                    })
                  }
                  placeholder="Check # or Ref #"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={submitPayment} disabled={submitting}>
                {submitting ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Invoice Dialog */}
      <Dialog open={newInvoiceDialogOpen} onOpenChange={setNewInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tab === "sales" ? "Tạo hóa đơn bán hàng" : "Tạo hóa đơn mua hàng"}
            </DialogTitle>
            <DialogDescription>
              Nhập thông tin để tạo hóa đơn mới
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{tab === "sales" ? "Khách hàng" : "Nhà cung cấp"} *</Label>
              <Select
                value={newInvoiceData.entityId}
                onValueChange={(value) =>
                  setNewInvoiceData({ ...newInvoiceData, entityId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tab === "sales" ? "Chọn khách hàng" : "Chọn nhà cung cấp"} />
                </SelectTrigger>
                <SelectContent>
                  {(tab === "sales" ? customers : suppliers).map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.code} - {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngày hóa đơn *</Label>
                <Input
                  type="date"
                  value={newInvoiceData.invoiceDate}
                  onChange={(e) =>
                    setNewInvoiceData({ ...newInvoiceData, invoiceDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Ngày đến hạn *</Label>
                <Input
                  type="date"
                  value={newInvoiceData.dueDate}
                  onChange={(e) =>
                    setNewInvoiceData({ ...newInvoiceData, dueDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tổng tiền *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newInvoiceData.totalAmount}
                onChange={(e) =>
                  setNewInvoiceData({ ...newInvoiceData, totalAmount: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Input
                value={newInvoiceData.notes}
                onChange={(e) =>
                  setNewInvoiceData({ ...newInvoiceData, notes: e.target.value })
                }
                placeholder="Ghi chú (tùy chọn)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setNewInvoiceDialogOpen(false)}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                onClick={submitNewInvoice}
                disabled={submitting || !newInvoiceData.entityId || !newInvoiceData.totalAmount}
              >
                {submitting ? "Đang tạo..." : "Tạo hóa đơn"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoicingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InvoicingContent />
    </Suspense>
  );
}
