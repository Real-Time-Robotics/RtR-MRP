
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Truck, Calendar, FileText, CheckCircle, Clock, Ban, Printer } from 'lucide-react';
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
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [params.id]);

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
    };

    return (
        <div className="space-y-6 container mx-auto max-w-5xl py-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" iconOnly size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
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
                <Button variant="secondary" size="sm" onClick={handlePrintPDF}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print PDF
                </Button>
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
                                                        <div className="font-medium">{line.part.partNumber}</div>
                                                        <div className="text-xs text-muted-foreground">{line.part.name}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{line.quantity} <span className="text-xs text-muted-foreground">{line.part.unit}</span></TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {line.receivedQty > 0 ? (
                                                            <span className="text-green-600">{line.receivedQty}</span>
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
                                    <div className="font-semibold text-lg">{po.supplier.name}</div>
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
