
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIContextSync } from '@/hooks/use-ai-context-sync';
import { ArrowLeft, ShoppingCart, User, Calendar, FileText, Printer, Package } from 'lucide-react';
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
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<OrderDetail | null>(null);

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
                <Button variant="ghost" className="h-9 w-9 p-0" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Order Detail
                        <Badge variant="outline" className="font-mono text-base">{order.orderNumber}</Badge>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className={
                            order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'
                        }>
                            {order.status}
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                            Date: {new Date(order.orderDate).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handlePrintPackingList}>
                    <Package className="h-4 w-4 mr-2" />
                    Packing List
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
        </div>
    );
}
