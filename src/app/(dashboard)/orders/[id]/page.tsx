
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
    requiredQty: number;
    totalAvailable: number;
    sufficient: boolean;
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
        product: {
            name: string;
            sku: string;
        };
    }>;
    shipment: ShipmentDetail | null;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [showShipDialog, setShowShipDialog] = useState(false);
    const [shipCarrier, setShipCarrier] = useState('');
    const [shipTracking, setShipTracking] = useState('');
    const [shipping, setShipping] = useState(false);
    const [delivering, setDelivering] = useState(false);
    const [inventoryPreview, setInventoryPreview] = useState<InventoryPreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [lotAllocations, setLotAllocations] = useState<Record<number, Record<string, number>>>({});

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
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [params.id]);

    useAIContextSync('order', order); // Sync with AI

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

            // Pre-fill lotAllocations from allocationPlan
            const prefilled: Record<number, Record<string, number>> = {};
            for (const line of data.lines) {
                prefilled[line.lineNumber] = {};
                for (const lot of line.lots) {
                    const planned = line.allocationPlan.find(a => a.lotNumber === lot.lotNumber);
                    prefilled[line.lineNumber][lot.lotNumber] = planned ? planned.deductQty : 0;
                }
            }
            setLotAllocations(prefilled);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleOpenShipDialog = () => {
        setShowShipDialog(true);
        setInventoryPreview(null);
        setLotAllocations({});
        fetchInventoryPreview();
    };

    const handleShipOrder = async () => {
        try {
            setShipping(true);

            // Build lotAllocations payload from state
            const lotAllocationsPayload = inventoryPreview?.lines.map((line) => ({
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
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi khi xuất kho');
            toast.success(data.message || 'Đã xuất kho thành công');
            setShowShipDialog(false);
            setShipCarrier('');
            setShipTracking('');
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setShipping(false);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!order?.shipment) return;
        try {
            setDelivering(true);
            const res = await fetch(`/api/shipments/${order.shipment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deliver' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lỗi khi xác nhận giao hàng');
            toast.success(data.message || 'Đã xác nhận giao hàng');
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setDelivering(false);
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

    const allLinesMatched = inventoryPreview?.lines.every((line) => {
        const { matched } = getAllocationStatus(line);
        return matched;
    }) ?? false;

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
    const canShip = ['completed', 'in_progress'].includes(order.status) && !order.shipment;
    const canConfirmDelivery = order.shipment?.status === 'SHIPPED';

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

    return (
        <div className="space-y-6 container mx-auto max-w-5xl py-6">
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
                    {canConfirmDelivery && (
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<CheckCircle2 className="h-4 w-4" />}
                            onClick={handleConfirmDelivery}
                            loading={delivering}
                            loadingText="Đang xử lý..."
                        >
                            Xác nhận đã giao
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
                                                    <TableCell className="text-right">${line.unitPrice.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ${(line.quantity * line.unitPrice).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-right font-bold">Total Amount</TableCell>
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
                            {/* Shipment Status Card */}
                            {order.shipment && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Truck className="h-4 w-4" />
                                            Thông tin xuất kho
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Mã phiếu</span>
                                            <span className="font-mono font-medium">{order.shipment.shipmentNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Trạng thái</span>
                                            <Badge className={
                                                order.shipment.status === 'DELIVERED'
                                                    ? 'bg-teal-100 text-teal-800'
                                                    : order.shipment.status === 'SHIPPED'
                                                        ? 'bg-indigo-100 text-indigo-800'
                                                        : 'bg-orange-100 text-orange-800'
                                            }>
                                                {order.shipment.status === 'DELIVERED' ? 'Đã giao hàng'
                                                    : order.shipment.status === 'SHIPPED' ? 'Đã xuất kho'
                                                        : 'Đang chuẩn bị'}
                                            </Badge>
                                        </div>
                                        {order.shipment.carrier && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Đơn vị vận chuyển</span>
                                                <span>{order.shipment.carrier}</span>
                                            </div>
                                        )}
                                        {order.shipment.trackingNumber && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Mã vận đơn</span>
                                                <span className="font-mono">{order.shipment.trackingNumber}</span>
                                            </div>
                                        )}
                                        {order.shipment.shippedAt && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Ngày xuất kho</span>
                                                <span>{new Date(order.shipment.shippedAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {order.shipment.deliveredAt && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Ngày giao hàng</span>
                                                <span>{new Date(order.shipment.deliveredAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
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
                            Chọn lot và số lượng xuất cho từng sản phẩm, sau đó xác nhận xuất kho.
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
                                {/* Global warning if insufficient */}
                                {!inventoryPreview.allSufficient && (
                                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="font-medium">Không đủ tồn kho!</p>
                                            <p>Một hoặc nhiều sản phẩm không đủ hàng trong kho. Vui lòng kiểm tra lại trước khi xuất kho.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Per-product inventory table */}
                                {inventoryPreview.lines.map((line) => (
                                    <div key={line.lineNumber} className="rounded-md border p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium">{line.productName}</span>
                                                <span className="text-muted-foreground text-xs ml-2">({line.productSku})</span>
                                            </div>
                                            <Badge className={
                                                line.sufficient
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }>
                                                {line.sufficient ? 'Đủ hàng' : 'Thiếu hàng'}
                                            </Badge>
                                        </div>

                                        <div className="flex gap-4 text-xs text-muted-foreground">
                                            <span>Cần xuất: <strong className="text-foreground">{line.requiredQty}</strong></span>
                                            <span>Tồn kho: <strong className={line.sufficient ? 'text-green-700' : 'text-red-700'}>{line.totalAvailable}</strong></span>
                                            {!line.sufficient && (
                                                <span className="text-red-600">Thiếu: <strong>{line.requiredQty - line.totalAvailable}</strong></span>
                                            )}
                                        </div>

                                        {/* Lot details table */}
                                        {line.lots.length > 0 ? (
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
                                                                ? 'bg-green-50 text-green-700'
                                                                : totalAllocated > required
                                                                    ? 'bg-red-50 text-red-700'
                                                                    : 'bg-amber-50 text-amber-700'
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
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">Không tìm thấy tồn kho nào.</p>
                                        )}
                                    </div>
                                ))}
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
                            disabled={shipping || loadingPreview || !inventoryPreview || !allLinesMatched}
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
