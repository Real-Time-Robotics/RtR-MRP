
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIContextSync } from '@/hooks/use-ai-context-sync';
import { ArrowLeft, ShoppingCart, User, Calendar, FileText, Package, Truck, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui-v2/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { EntityAuditHistory } from '@/components/audit/entity-audit-history';
import { useWorkSession } from '@/hooks/use-work-session';
import { SmartBreadcrumb } from '@/components/smart-breadcrumb';
import { EntityTooltip } from '@/components/entity-tooltip';

interface InventoryLot {
    lotNumber: string;
    quantity: number;
    warehouseCode: string;
}

interface AllocationPlanItem {
    lotNumber: string;
    deductQty: number;
}

interface InventoryPreviewLine {
    lineNumber: number;
    productId: string;
    productSku: string;
    productName: string;
    orderQty: number;
    shippedQty: number;
    requiredQty: number;
    totalAvailable: number;
    sufficient: boolean;
    fullyShipped: boolean;
    lots: InventoryLot[];
    allocationPlan: AllocationPlanItem[];
}

interface InventoryPreview {
    lines: InventoryPreviewLine[];
    allSufficient: boolean;
}

interface ShipmentDetail {
    id: string;
    shipmentNumber: string;
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    lines: Array<{
        id: string;
        lineNumber: number;
        quantity: number;
        product: { name: string; sku: string };
    }>;
}

interface OrderDetail {
    id: string;
    orderNumber: string;
    status: string;
    orderDate: string;
    requiredDate: string;
    notes: string | null;
    customer: {
        id: string;
        name: string;
        email: string | null;
    };
    lines: Array<{
        id: string;
        lineNumber: number;
        quantity: number;
        unitPrice: number;
        shippedQty: number;
        product: {
            name: string;
            sku: string;
        };
    }>;
    shipments: ShipmentDetail[];
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [showShipDialog, setShowShipDialog] = useState(false);
    const [shipCarrier, setShipCarrier] = useState('');
    const [shipTracking, setShipTracking] = useState('');
    const [shipping, setShipping] = useState(false);
    const [deliveringShipmentId, setDeliveringShipmentId] = useState<string | null>(null);
    const [inventoryPreview, setInventoryPreview] = useState<InventoryPreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [lotAllocations, setLotAllocations] = useState<Record<number, Record<string, number>>>({});
    const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());

    // Work Session tracking
    const { trackActivity, updateContext } = useWorkSession({
        entityType: 'SO',
        entityId: params.id,
        entityNumber: order?.orderNumber || params.id,
        workflowSteps: ['Xem chi tiết', 'Xuất kho', 'Xác nhận giao hàng'],
        currentStep: 1,
        enabled: !!params.id,
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/orders/${params.id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Không tìm thấy đơn hàng.");
                throw new Error("Lỗi tải dữ liệu.");
            }
            const data = await res.json();
            setOrder(data);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [params.id]);

    useAIContextSync('order', order); // Sync with AI

    // Update work session context when order data loads
    useEffect(() => {
        if (!order) return;
        const totalAmount = order.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
        const shippedLines = order.lines.filter(l => (l.shippedQty || 0) >= l.quantity).length;
        updateContext({
            summary: `SO ${order.orderNumber} - ${order.customer.name} - ${order.status}`,
            keyMetrics: {
                status: order.status,
                customer: order.customer.name,
                totalAmount: `$${totalAmount.toFixed(2)}`,
                lineCount: order.lines.length,
                shippedLines: `${shippedLines}/${order.lines.length}`,
                shipmentCount: order.shipments?.length || 0,
            },
        });
    }, [order, updateContext]);

    const fetchInventoryPreview = async () => {
        try {
            setLoadingPreview(true);
            const res = await fetch(`/api/orders/${params.id}/ship`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Lỗi khi kiểm tra tồn kho');
            }
            const data: InventoryPreview = await res.json();
            setInventoryPreview(data);

            // Pre-select lines that have remaining qty > 0
            const preSelected = new Set<number>();
            const prefilled: Record<number, Record<string, number>> = {};
            for (const line of data.lines) {
                if (!line.fullyShipped && line.requiredQty > 0) {
                    preSelected.add(line.lineNumber);
                }
                prefilled[line.lineNumber] = {};
                for (const lot of line.lots) {
                    const planned = line.allocationPlan.find(a => a.lotNumber === lot.lotNumber);
                    prefilled[line.lineNumber][lot.lotNumber] = planned ? planned.deductQty : 0;
                }
            }
            setSelectedLines(preSelected);
            setLotAllocations(prefilled);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleOpenShipDialog = () => {
        setShowShipDialog(true);
        setInventoryPreview(null);
        setLotAllocations({});
        setSelectedLines(new Set());
        setShipCarrier('');
        setShipTracking('');
        fetchInventoryPreview();
    };

    const handleToggleLine = (lineNumber: number) => {
        setSelectedLines(prev => {
            const next = new Set(prev);
            if (next.has(lineNumber)) {
                next.delete(lineNumber);
            } else {
                next.add(lineNumber);
            }
            return next;
        });
    };

    const handleShipOrder = async () => {
        if (!inventoryPreview) return;
        try {
            setShipping(true);

            // Build linesToShip from selected lines
            const activeLines = inventoryPreview.lines.filter(
                (l) => selectedLines.has(l.lineNumber) && !l.fullyShipped
            );

            const linesToShip = activeLines.map((line) => {
                const lineAllocs = lotAllocations[line.lineNumber] || {};
                const totalAllocated = Object.values(lineAllocs).reduce((sum, qty) => sum + qty, 0);
                return {
                    lineNumber: line.lineNumber,
                    quantity: totalAllocated,
                };
            });

            // Build lotAllocations payload for selected lines only
            const lotAllocationsPayload = activeLines.map((line) => ({
                lineNumber: line.lineNumber,
                allocations: Object.entries(lotAllocations[line.lineNumber] || {})
                    .filter(([, qty]) => qty > 0)
                    .map(([lotNumber, quantity]) => ({ lotNumber, quantity })),
            }));

            const res = await fetch(`/api/orders/${params.id}/ship`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    carrier: shipCarrier || undefined,
                    trackingNumber: shipTracking || undefined,
                    lotAllocations: lotAllocationsPayload,
                    linesToShip,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi khi xuất kho');
            toast.success(data.message || 'Đã xuất kho thành công');
            trackActivity('SO_SHIP', `Xuất kho cho ${order?.orderNumber}`, { carrier: shipCarrier, tracking: shipTracking });
            setShowShipDialog(false);
            setShipCarrier('');
            setShipTracking('');
            fetchData();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setShipping(false);
        }
    };

    const handleConfirmDelivery = async (shipmentId: string) => {
        try {
            setDeliveringShipmentId(shipmentId);
            const res = await fetch(`/api/shipments/${shipmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deliver' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi khi xác nhận giao hàng');
            toast.success(data.message || 'Đã xác nhận giao hàng');
            trackActivity('SO_DELIVERY_CONFIRMED', `Xác nhận giao hàng shipment ${shipmentId}`);
            fetchData();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setDeliveringShipmentId(null);
        }
    };

    const handleLotQtyChange = (lineNumber: number, lotNumber: string, value: number) => {
        setLotAllocations(prev => ({
            ...prev,
            [lineNumber]: {
                ...prev[lineNumber],
                [lotNumber]: value,
            },
        }));
    };

    const getAllocationStatus = (line: InventoryPreviewLine) => {
        const lineAllocs = lotAllocations[line.lineNumber] || {};
        const totalAllocated = Object.values(lineAllocs).reduce((sum, qty) => sum + qty, 0);
        return { totalAllocated, required: line.requiredQty, matched: totalAllocated === line.requiredQty };
    };

    // Only check selected, non-fully-shipped lines
    const allSelectedLinesMatched = inventoryPreview?.lines
        .filter((line) => selectedLines.has(line.lineNumber) && !line.fullyShipped)
        .every((line) => {
            const { matched } = getAllocationStatus(line);
            return matched;
        }) ?? false;

    const hasSelectedLines = inventoryPreview?.lines.some(
        (line) => selectedLines.has(line.lineNumber) && !line.fullyShipped
    ) ?? false;

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold">Not Found</h2>
                <Button variant="ghost" onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    const totalAmount = order.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);

    // canShip: order has unshipped lines and status allows shipping
    const hasUnshippedLines = order.lines.some((l) => (l.shippedQty || 0) < l.quantity);
    const canShip = ['completed', 'in_progress', 'partially_shipped'].includes(order.status) && hasUnshippedLines;

    const handlePrintPackingList = async () => {
        const { generatePackingListPDF } = await import('@/lib/documents');
        generatePackingListPDF({
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            customer: {
                code: '-',
                name: order.customer.name,
                contactName: null,
                contactPhone: null,
                billingAddress: null,
            },
            notes: order.notes,
            lines: order.lines.map((line) => ({
                lineNumber: line.lineNumber,
                product: line.product,
                quantity: line.quantity,
                unit: 'pcs',
            })),
        });
    };

    const getShippedBadge = (shippedQty: number, quantity: number) => {
        if (shippedQty >= quantity) {
            return <Badge className="bg-success-100 text-success-800 text-xs">{shippedQty}/{quantity}</Badge>;
        }
        if (shippedQty > 0) {
            return <Badge className="bg-warning-100 text-warning-800 text-xs">{shippedQty}/{quantity}</Badge>;
        }
        return <Badge className="bg-gray-100 text-gray-500 text-xs">0/{quantity}</Badge>;
    };

    return (
        <div className="space-y-6 container mx-auto max-w-5xl py-6">
            {/* Smart Breadcrumb with Progress */}
            <SmartBreadcrumb
                items={[
                    { label: 'Sales Orders', href: '/orders' },
                    { label: order.orderNumber },
                ]}
                entityType="SO"
                entityData={order as unknown as Record<string, unknown>}
            />

            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" iconOnly onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Order Detail
                        <Badge variant="outline" className="font-mono text-base">{order.orderNumber}</Badge>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <OrderStatusBadge status={order.status} />
                        <span className="text-muted-foreground text-sm">
                            Date: {new Date(order.orderDate).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canShip && (
                        <Button variant="primary" size="sm" leftIcon={<Truck className="h-4 w-4" />} onClick={handleOpenShipDialog}>
                            Xuất kho
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" leftIcon={<Package className="h-4 w-4" />} onClick={handlePrintPackingList}>
                        Packing List
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
                                        <ShoppingCart className="h-4 w-4" />
                                        Order Items
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">#</TableHead>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead className="text-center">Đã xuất</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {order.lines.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell>{line.lineNumber}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{line.product.name}</div>
                                                        <div className="text-xs text-muted-foreground">{line.product.sku}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{line.quantity}</TableCell>
                                                    <TableCell className="text-center">
                                                        {getShippedBadge(line.shippedQty || 0, line.quantity)}
                                                    </TableCell>
                                                    <TableCell className="text-right">${line.unitPrice.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ${(line.quantity * line.unitPrice).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-right font-bold">Total Amount</TableCell>
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
                            {/* Shipment Status Cards - show ALL shipments */}
                            {order.shipments && order.shipments.length > 0 && (
                                <div className="space-y-4">
                                    {order.shipments.map((shipment) => (
                                        <Card key={shipment.id}>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="flex items-center gap-2 text-base">
                                                    <Truck className="h-4 w-4" />
                                                    <span className="truncate">{shipment.shipmentNumber}</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">Trạng thái</span>
                                                    <Badge className={
                                                        shipment.status === 'DELIVERED'
                                                            ? 'bg-teal-100 text-teal-800'
                                                            : shipment.status === 'SHIPPED'
                                                                ? 'bg-indigo-100 text-indigo-800'
                                                                : 'bg-orange-100 text-orange-800'
                                                    }>
                                                        {shipment.status === 'DELIVERED' ? 'Đã giao hàng'
                                                            : shipment.status === 'SHIPPED' ? 'Đã xuất kho'
                                                                : 'Đang chuẩn bị'}
                                                    </Badge>
                                                </div>
                                                {shipment.carrier && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Vận chuyển</span>
                                                        <span>{shipment.carrier}</span>
                                                    </div>
                                                )}
                                                {shipment.trackingNumber && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Mã vận đơn</span>
                                                        <span className="font-mono text-xs">{shipment.trackingNumber}</span>
                                                    </div>
                                                )}
                                                {shipment.shippedAt && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Ngày xuất</span>
                                                        <span>{new Date(shipment.shippedAt).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                {shipment.deliveredAt && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Ngày giao</span>
                                                        <span>{new Date(shipment.deliveredAt).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                                {/* Lines in this shipment */}
                                                <div className="pt-2 border-t">
                                                    <p className="text-xs text-muted-foreground mb-1">Sản phẩm:</p>
                                                    <ul className="space-y-0.5">
                                                        {shipment.lines.map((sl) => (
                                                            <li key={sl.id} className="flex justify-between text-xs">
                                                                <span>{sl.product.name}</span>
                                                                <span className="font-mono">x{sl.quantity}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                {/* Confirm delivery button per shipment */}
                                                {shipment.status === 'SHIPPED' && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        className="w-full mt-2"
                                                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                                        onClick={() => handleConfirmDelivery(shipment.id)}
                                                        loading={deliveringShipmentId === shipment.id}
                                                        loadingText="Đang xử lý..."
                                                    >
                                                        Xác nhận đã giao
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <User className="h-4 w-4" />
                                        Customer Info
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="font-semibold text-lg">{order.customer.name}</div>
                                    <div className="text-sm text-muted-foreground">{order.customer.email || 'No email provided'}</div>
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
                                        {order.notes || "No notes for this order."}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Calendar className="h-4 w-4" />
                                        Dates
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Ordered</span>
                                        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Required</span>
                                        <span className="font-medium">{new Date(order.requiredDate).toLocaleDateString()}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <EntityAuditHistory entityType="SalesOrder" entityId={order.id} title="Lịch sử thay đổi" />
                </TabsContent>

                <TabsContent value="discussions" className="mt-4">
                    <EntityDiscussions
                        contextType="SALES_ORDER"
                        contextId={order.id}
                        contextTitle={`Order ${order.orderNumber} - ${order.customer.name}`}
                    />
                </TabsContent>
            </Tabs>

            {/* Ship Dialog */}
            <Dialog open={showShipDialog} onOpenChange={setShowShipDialog}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Xuất kho - {order.orderNumber}</DialogTitle>
                        <DialogDescription>
                            Chọn dòng sản phẩm muốn xuất, điều chỉnh số lượng và lot, sau đó xác nhận.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="carrier">Đơn vị vận chuyển</Label>
                                <Input
                                    id="carrier"
                                    placeholder="VD: Viettel Post, GHTK..."
                                    value={shipCarrier}
                                    onChange={(e) => setShipCarrier(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tracking">Mã vận đơn</Label>
                                <Input
                                    id="tracking"
                                    placeholder="VD: VTP123456789"
                                    value={shipTracking}
                                    onChange={(e) => setShipTracking(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Inventory Preview Section */}
                        {loadingPreview ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Đang kiểm tra tồn kho...
                            </div>
                        ) : inventoryPreview ? (
                            <div className="space-y-3">
                                {/* Per-product inventory table */}
                                {inventoryPreview.lines.map((line) => {
                                    const isSelected = selectedLines.has(line.lineNumber);
                                    const isFullyShipped = line.fullyShipped;

                                    return (
                                        <div key={line.lineNumber} className={`rounded-md border p-3 space-y-2 ${isFullyShipped ? 'opacity-50' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {/* Checkbox to select line */}
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={isFullyShipped}
                                                    onChange={() => handleToggleLine(line.lineNumber)}
                                                    aria-label={`Chọn dòng ${line.lineNumber}`}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                                <div className="flex-1 flex items-center justify-between">
                                                    <EntityTooltip type="part" id={line.productId}>
                                                        <div className="cursor-help">
                                                            <span className="font-medium">{line.productName}</span>
                                                            <span className="text-muted-foreground text-xs ml-2">({line.productSku})</span>
                                                        </div>
                                                    </EntityTooltip>
                                                    {isFullyShipped ? (
                                                        <Badge className="bg-success-100 text-success-800">Đã xuất đủ</Badge>
                                                    ) : (
                                                        <Badge className={
                                                            line.sufficient
                                                                ? 'bg-success-100 text-success-800'
                                                                : 'bg-danger-100 text-danger-800'
                                                        }>
                                                            {line.sufficient ? 'Đủ hàng' : 'Thiếu hàng'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {!isFullyShipped && (
                                                <>
                                                    <div className="flex gap-4 text-xs text-muted-foreground ml-6">
                                                        <span>Đặt hàng: <strong className="text-foreground">{line.orderQty}</strong></span>
                                                        <span>Đã xuất: <strong className="text-foreground">{line.shippedQty}</strong></span>
                                                        <span>Cần xuất: <strong className="text-foreground">{line.requiredQty}</strong></span>
                                                        <span>Tồn kho: <strong className={line.sufficient ? 'text-success-700' : 'text-danger-700'}>{line.totalAvailable}</strong></span>
                                                    </div>

                                                    {/* Lot details table — only if line is selected */}
                                                    {isSelected && line.lots.length > 0 && (
                                                        <>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="text-xs h-8">Lot Number</TableHead>
                                                                        <TableHead className="text-xs h-8">Kho</TableHead>
                                                                        <TableHead className="text-xs h-8 text-right">Tồn kho</TableHead>
                                                                        <TableHead className="text-xs h-8 text-right">Số lượng xuất</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {line.lots.map((lot) => {
                                                                        const currentQty = lotAllocations[line.lineNumber]?.[lot.lotNumber] ?? 0;
                                                                        return (
                                                                            <TableRow key={lot.lotNumber}>
                                                                                <TableCell className="text-xs font-mono py-1.5">{lot.lotNumber}</TableCell>
                                                                                <TableCell className="text-xs py-1.5">{lot.warehouseCode}</TableCell>
                                                                                <TableCell className="text-xs text-right py-1.5">{lot.quantity}</TableCell>
                                                                                <TableCell className="text-right py-1">
                                                                                    <Input
                                                                                        type="number"
                                                                                        min={0}
                                                                                        max={lot.quantity}
                                                                                        value={currentQty}
                                                                                        onChange={(e) => {
                                                                                            const val = Math.max(0, Math.min(lot.quantity, parseInt(e.target.value) || 0));
                                                                                            handleLotQtyChange(line.lineNumber, lot.lotNumber, val);
                                                                                        }}
                                                                                        className="h-7 w-20 text-xs text-right ml-auto"
                                                                                    />
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                            {/* Validation row */}
                                                            {(() => {
                                                                const { totalAllocated, required, matched } = getAllocationStatus(line);
                                                                return (
                                                                    <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${
                                                                        matched
                                                                            ? 'bg-success-50 text-success-700'
                                                                            : totalAllocated > required
                                                                                ? 'bg-danger-50 text-danger-700'
                                                                                : 'bg-warning-50 text-warning-700'
                                                                    }`}>
                                                                        {matched ? (
                                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        ) : (
                                                                            <AlertTriangle className="h-3.5 w-3.5" />
                                                                        )}
                                                                        <span>
                                                                            Đã chọn: <strong>{totalAllocated}</strong> / {required}
                                                                            {!matched && totalAllocated < required && ' — Chưa đủ số lượng'}
                                                                            {!matched && totalAllocated > required && ' — Vượt quá số lượng'}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </>
                                                    )}
                                                    {isSelected && line.lots.length === 0 && (
                                                        <p className="text-xs text-muted-foreground italic ml-6">Không tìm thấy tồn kho nào.</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-md bg-muted p-3 text-sm">
                                <p className="font-medium mb-1">Sản phẩm xuất kho:</p>
                                <ul className="space-y-1">
                                    {order.lines.map((line) => (
                                        <li key={line.id} className="flex justify-between">
                                            <span>{line.product.name} ({line.product.sku})</span>
                                            <span className="font-mono">x{line.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" size="sm" onClick={() => setShowShipDialog(false)} disabled={shipping}>
                            Hủy
                        </Button>
                        <Button
                            size="sm"
                            leftIcon={<Truck className="h-4 w-4" />}
                            onClick={handleShipOrder}
                            disabled={shipping || loadingPreview || !inventoryPreview || !allSelectedLinesMatched || !hasSelectedLines}
                            loading={shipping}
                            loadingText="Đang xử lý..."
                        >
                            Xác nhận xuất kho
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
