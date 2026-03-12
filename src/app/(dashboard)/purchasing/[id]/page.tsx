
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Truck, Calendar, FileText, CheckCircle, Clock, Ban, Printer, Send, PackageCheck, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui-v2/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntityDiscussions } from '@/components/discussions/entity-discussions';
import { EntityAuditHistory } from '@/components/audit/entity-audit-history';
import { useWorkSession } from '@/hooks/use-work-session';
import { SmartBreadcrumb } from '@/components/smart-breadcrumb';
import { EntityTooltip } from '@/components/entity-tooltip';

interface PurchaseOrderDetail {
    id: string;
    poNumber: string;
    status: 'draft' | 'pending' | 'confirmed' | 'in_progress' | 'received' | 'cancelled';
    orderDate: string;
    expectedDate: string;
    notes: string | null;
    supplier: {
        id: string;
        name: string;
        contactName: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
    };
    lines: Array<{
        id: string;
        lineNumber: number;
        quantity: number;
        unitPrice: number;
        receivedQty: number;
        part: {
            id: string;
            partNumber: string;
            name: string;
            unit: string;
        };
    }>;
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-800',
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    received: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
};

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);

    // Work Session tracking
    const { trackActivity, updateContext } = useWorkSession({
        entityType: 'PO',
        entityId: params.id,
        entityNumber: po?.poNumber || params.id,
        workflowSteps: ['Xem chi tiết', 'Cập nhật trạng thái', 'In PDF'],
        currentStep: 1,
        enabled: !!params.id,
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            // NOTE: Frontend route is /purchasing/[id] but API is /api/purchase-orders/[id]
            const res = await fetch(`/api/purchase-orders/${params.id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Không tìm thấy đơn mua hàng (PO).");
                throw new Error("Lỗi tải dữ liệu.");
            }
            const data = await res.json();
            setPo(data.data || data); // Wrapper might return { data: ... }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [params.id]);

    // Update work session context when PO data loads
    useEffect(() => {
        if (!po) return;
        const totalAmount = po.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
        updateContext({
            summary: `PO ${po.poNumber} - ${po.supplier.name} - ${po.status}`,
            keyMetrics: {
                status: po.status,
                supplier: po.supplier.name,
                totalAmount: `$${totalAmount.toFixed(2)}`,
                lineCount: po.lines.length,
            },
        });
    }, [po, updateContext]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!po) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold">Not Found</h2>
                <Button variant="ghost" onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    const totalAmount = po.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);

    const handlePrintPDF = async () => {
        const { generatePurchaseOrderPDF } = await import('@/lib/documents');
        generatePurchaseOrderPDF(po);
        trackActivity('PO_PRINT_PDF', `In PDF cho ${po.poNumber}`);
    };

    const handleStatusChange = async (newStatus: string, label: string) => {
        if (!confirm(`Bạn có chắc muốn chuyển trạng thái PO sang "${label}"?`)) return;
        setStatusLoading(true);
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Lỗi cập nhật trạng thái');
            }
            toast.success(`PO đã chuyển sang trạng thái "${label}"`);
            trackActivity('PO_STATUS_CHANGE', `Chuyển trạng thái sang "${label}"`, { from: po?.status, to: newStatus });
            fetchData();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Lỗi cập nhật trạng thái');
        } finally {
            setStatusLoading(false);
        }
    };

    const STATUS_ACTIONS: Record<string, Array<{ status: string; label: string; icon: React.ReactNode; variant: 'primary' | 'danger' | 'secondary' | 'ghost' }>> = {
        draft: [
            { status: 'pending', label: 'Gửi PO', icon: <Send className="h-4 w-4" />, variant: 'primary' },
            { status: 'cancelled', label: 'Hủy', icon: <XCircle className="h-4 w-4" />, variant: 'danger' },
        ],
        pending: [
            { status: 'confirmed', label: 'Xác nhận', icon: <CheckCircle className="h-4 w-4" />, variant: 'primary' },
            { status: 'cancelled', label: 'Hủy', icon: <XCircle className="h-4 w-4" />, variant: 'danger' },
        ],
        confirmed: [
            { status: 'in_progress', label: 'Đang giao', icon: <Truck className="h-4 w-4" />, variant: 'primary' },
            { status: 'cancelled', label: 'Hủy', icon: <XCircle className="h-4 w-4" />, variant: 'danger' },
        ],
        in_progress: [
            { status: 'received', label: 'Đã nhận hàng', icon: <PackageCheck className="h-4 w-4" />, variant: 'primary' },
        ],
    };

    const availableActions = STATUS_ACTIONS[po.status] || [];

    return (
        <div className="space-y-6 container mx-auto max-w-5xl py-6">
            {/* Smart Breadcrumb with Progress */}
            <SmartBreadcrumb
                items={[
                    { label: 'Purchasing', href: '/purchasing' },
                    { label: po.poNumber },
                ]}
                entityType="PO"
                entityData={po as unknown as Record<string, unknown>}
            />

            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" iconOnly onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Purchase Order
                        <Badge variant="outline" className="font-mono text-base">{po.poNumber}</Badge>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className={STATUS_COLORS[po.status] || 'bg-slate-100'}>
                            {po.status.toUpperCase()}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                            Ordered: {new Date(po.orderDate).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {availableActions.map((action) => (
                        <Button
                            key={action.status}
                            variant={action.variant}
                            size="sm"
                            disabled={statusLoading}
                            leftIcon={statusLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
                            onClick={() => handleStatusChange(action.status, action.label)}
                        >
                            {action.label}
                        </Button>
                    ))}
                    <Button variant="secondary" size="sm" leftIcon={<Printer className="h-4 w-4" />} onClick={handlePrintPDF}>
                        Print PDF
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList>
                    <TabsTrigger value="details">Chi tiết</TabsTrigger>
                    <TabsTrigger value="history">Lịch sử</TabsTrigger>
                    <TabsTrigger value="discussions">Thảo luận</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column: Line Items */}
                        <div className="space-y-6 col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FileText className="h-4 w-4" />
                                        PO Items
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">#</TableHead>
                                                <TableHead>Part</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead className="text-right">Received</TableHead>
                                                <TableHead className="text-right">Unit Price</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {po.lines.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell>{line.lineNumber}</TableCell>
                                                    <TableCell>
                                                        <EntityTooltip type="part" id={line.part.id}>
                                                            <div className="cursor-help">
                                                                <div className="font-medium">{line.part.partNumber}</div>
                                                                <div className="text-xs text-muted-foreground">{line.part.name}</div>
                                                            </div>
                                                        </EntityTooltip>
                                                    </TableCell>
                                                    <TableCell className="text-right">{line.quantity} <span className="text-xs text-muted-foreground">{line.part.unit}</span></TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {line.receivedQty > 0 ? (
                                                            <span className="text-success-600">{line.receivedQty}</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">${line.unitPrice.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ${(line.quantity * line.unitPrice).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-right font-bold">Total Estimated Cost</TableCell>
                                                <TableCell className="text-right font-bold text-lg">
                                                    ${totalAmount.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Meta Info */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Truck className="h-4 w-4" />
                                        Supplier
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <EntityTooltip type="supplier" id={po.supplier.id}>
                                        <div className="font-semibold text-lg cursor-help">{po.supplier.name}</div>
                                    </EntityTooltip>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {po.supplier.contactName && <div>Contact: {po.supplier.contactName}</div>}
                                        {po.supplier.contactEmail && <div>Email: {po.supplier.contactEmail}</div>}
                                        {po.supplier.contactPhone && <div>Phone: {po.supplier.contactPhone}</div>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Calendar className="h-4 w-4" />
                                        Timeline
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Order Date</span>
                                        <span>{new Date(po.orderDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Expected Date</span>
                                        <span className="font-medium text-orange-600">{new Date(po.expectedDate).toLocaleDateString()}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FileText className="h-4 w-4" />
                                        Notes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground italic">
                                        {po.notes || "No additional notes."}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <EntityAuditHistory entityType="PurchaseOrder" entityId={po.id} title="Lịch sử thay đổi" />
                </TabsContent>

                <TabsContent value="discussions" className="mt-4">
                    <EntityDiscussions
                        contextType="PURCHASE_ORDER"
                        contextId={po.id}
                        contextTitle={`PO ${po.poNumber} - ${po.supplier.name}`}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
