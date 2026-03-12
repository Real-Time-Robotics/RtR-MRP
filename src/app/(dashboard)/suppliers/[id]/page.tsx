
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAIContextSync } from '@/hooks/use-ai-context-sync';
import { ArrowLeft, Building2, Phone, Mail, MapPin, Star, Package, ShoppingBag, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui-v2/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { ConversationPanel } from '@/components/conversations';
import { EntityAuditHistory } from '@/components/audit/entity-audit-history';
import { EntityTooltip } from '@/components/entity-tooltip';

interface SupplierDetail {
    id: string;
    code: string;
    name: string;
    status: 'active' | 'inactive' | 'pending';
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    address: string | null;
    rating: number | null;
    leadTimeDays: number;
    partSuppliers: Array<{
        part: {
            id: string;
            partNumber: string;
            name: string;
            category: string;
        }
    }>;
    purchaseOrders: Array<{
        id: string;
        poNumber: string;
        orderDate: string;
        status: string;
        totalAmount: number;
    }>;
    _count: {
        partSuppliers: number;
        purchaseOrders: number;
    }
}

export default function SupplierDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [supplier, setSupplier] = useState<SupplierDetail | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/suppliers/${params.id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Không tìm thấy nhà cung cấp.");
                throw new Error("Lỗi tải dữ liệu.");
            }
            const data = await res.json();
            setSupplier(data.data || data);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [params.id]);

    useAIContextSync('supplier', supplier);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold">Not Found</h2>
                <Button variant="ghost" onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto max-w-5xl py-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" iconOnly onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {supplier.name}
                        <Badge variant="outline" className="font-mono text-base">{supplier.code}</Badge>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className={supplier.status === 'active' ? 'bg-success-100 text-success-800' : 'bg-slate-100 text-slate-800'}>
                            {supplier.status.toUpperCase()}
                        </Badge>
                        {supplier.rating && (
                            <div className="flex items-center text-warning-500 text-sm font-medium">
                                <Star className="h-4 w-4 fill-current mr-1" />
                                {supplier.rating}/5
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Contact & Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="h-4 w-4" />
                                Contact Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {supplier.contactName && (
                                <div>
                                    <div className="text-muted-foreground text-xs">Contact Person</div>
                                    <div className="font-medium">{supplier.contactName}</div>
                                </div>
                            )}
                            {supplier.contactEmail && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${supplier.contactEmail}`} className="hover:underline">{supplier.contactEmail}</a>
                                </div>
                            )}
                            {supplier.contactPhone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{supplier.contactPhone}</span>
                                </div>
                            )}
                            {supplier.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <span>{supplier.address}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Lead Time (Avg)</span>
                                <span className="font-medium">{supplier.leadTimeDays} Days</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Tabs (Products, Orders) */}
                <div className="space-y-6 col-span-2">
                    <Tabs defaultValue="products">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="products">
                                Products ({supplier._count.partSuppliers})
                            </TabsTrigger>
                            <TabsTrigger value="orders">
                                Orders ({supplier._count.purchaseOrders})
                            </TabsTrigger>
                            <TabsTrigger value="history">Lịch sử</TabsTrigger>
                            <TabsTrigger value="discussions">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Discussions
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="products" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle className="text-sm">Supplied Parts</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Part No</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Category</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {supplier.partSuppliers.length === 0 ? (
                                                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No parts assigned</TableCell></TableRow>
                                            ) : supplier.partSuppliers.map((ps) => (
                                                <TableRow key={ps.part.id}>
                                                    <TableCell>
                                                        <EntityTooltip type="part" id={ps.part.id}>
                                                            <span className="font-medium cursor-help">{ps.part.partNumber}</span>
                                                        </EntityTooltip>
                                                    </TableCell>
                                                    <TableCell>{ps.part.name}</TableCell>
                                                    <TableCell><Badge variant="outline">{ps.part.category}</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="orders" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle className="text-sm">Recent Purchase Orders</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>PO #</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {supplier.purchaseOrders.length === 0 ? (
                                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No recent orders</TableCell></TableRow>
                                            ) : supplier.purchaseOrders.map((po) => (
                                                <TableRow key={po.id}>
                                                    <TableCell>
                                                        <EntityTooltip type="po" id={po.id}>
                                                            <span className="font-medium cursor-help">{po.poNumber}</span>
                                                        </EntityTooltip>
                                                    </TableCell>
                                                    <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                                                    <TableCell><Badge variant="secondary">{po.status}</Badge></TableCell>
                                                    <TableCell className="text-right">${po.totalAmount?.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="history" className="mt-4">
                            <EntityAuditHistory entityType="Supplier" entityId={supplier.id} title="Lịch sử thay đổi" />
                        </TabsContent>

                        <TabsContent value="discussions" className="mt-4">
                            <ConversationPanel
                                contextType="SUPPLIER"
                                contextId={supplier.id}
                                contextTitle={`${supplier.code} - ${supplier.name}`}
                                className="h-[500px]"
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
