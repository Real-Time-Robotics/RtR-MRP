
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Use navigation, not router 
import { ArrowLeft, Package, MapPin, Box, Calendar, History, Save } from 'lucide-react';
import { Button } from '@/components/ui-v2/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { EntityDiscussions } from '@/components/discussions/entity-discussions';
import { useDataEntry } from '@/hooks/use-data-entry';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSmartGridStore } from '@/components/ui-v2/smart-grid';

interface InventoryDetail {
    id: string;
    quantity: number;
    reservedQty: number;
    available: number; // Computed in API usually, but here likely need to compute logic if using raw DB record
    locationCode: string | null;
    lotNumber: string | null;
    updatedAt: string;
    part: {
        id: string;
        partNumber: string;
        name: string;
        description: string | null;
        unit: string;
        category: string;
        image?: string;
    };
    warehouse: {
        id: string;
        name: string;
        location: string;
    };
}

export default function InventoryDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState<InventoryDetail | null>(null);

    // Edit State (for quick edits like Location/Lot)
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        locationCode: '',
        lotNumber: '',
        quantity: 0
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/inventory/${params.id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Không tìm thấy bản ghi kho này.");
                throw new Error("Lỗi tải dữ liệu.");
            }
            const data = await res.json();
            setInventory(data);
            setFormData({
                locationCode: data.locationCode || '',
                lotNumber: data.lotNumber || '',
                quantity: data.quantity
            });
        } catch (error: any) {
            toast.error(error.message);
            // Optional: Redirect back if not found? 
            // router.push('/inventory'); 
        } finally {
            setLoading(false);
        }
    };

    const setSelectedId = useSmartGridStore(state => state.setSelectedId);

    useEffect(() => {
        fetchData();
    }, [params.id]);

    // Sync AI Context when inventory data is loaded
    useEffect(() => {
        if (inventory) {
            // Context Intelligence expects a Part-like object to trigger analysis
            const contextItem = {
                id: inventory.part.id,
                partNumber: inventory.part.partNumber,
                name: inventory.part.name,
                category: inventory.part.category,
                unit: inventory.part.unit
            };
            setSelectedId(inventory.part.id, contextItem);
        }
    }, [inventory, setSelectedId]);

    const { submit, isSubmitting } = useDataEntry({
        onSubmit: async (data: typeof formData) => {
            const res = await fetch(`/api/inventory/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update");
            return await res.json();
        },
        onSuccess: (updated) => {
            setInventory(prev => prev ? ({ ...prev, ...updated }) : null);
            setEditMode(false);
        },
        successMessage: "Cập nhật thành công!"
    });

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!inventory) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-semibold">Not Found</h2>
                <Button variant="ghost" onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    const available = inventory.quantity - inventory.reservedQty;

    return (
        <div className="space-y-6 container mx-auto max-w-5xl py-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" iconOnly size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Inventory Detail
                        <Badge variant="outline" className="font-mono text-xs">{inventory.part.partNumber}</Badge>
                    </h1>
                    <p className="text-muted-foreground">{inventory.part.name}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    {!editMode ? (
                        <Button onClick={() => setEditMode(true)} variant="secondary">
                            Edit Location / Lot
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setEditMode(false)} disabled={isSubmitting}>Cancel</Button>
                            <Button onClick={() => submit(formData)} disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList>
                    <TabsTrigger value="details">Chi tiết</TabsTrigger>
                    <TabsTrigger value="discussions">Thảo luận</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column: Info */}
                        <div className="space-y-6 col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Package className="h-4 w-4" />
                                        Stock Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-6">
                                    <div>
                                        <Label className="text-muted-foreground text-xs uppercase">Quantity On Hand</Label>
                                        <div className="text-3xl font-bold mt-1">{inventory.quantity} <span className="text-sm font-normal text-muted-foreground">{inventory.part.unit}</span></div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs uppercase">Available</Label>
                                        <div className="text-3xl font-bold mt-1 text-green-600">{available} <span className="text-sm font-normal text-muted-foreground">{inventory.part.unit}</span></div>
                                    </div>
                                    <div className="col-span-2 grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                                        <div>
                                            <Label className="text-muted-foreground text-xs uppercase">Reserved</Label>
                                            <div className="font-semibold">{inventory.reservedQty}</div>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground text-xs uppercase">Allocated</Label>
                                            <div className="font-semibold">0</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <MapPin className="h-4 w-4" />
                                        Location & Storage
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Warehouse</Label>
                                            <div className="font-medium flex items-center gap-2">
                                                <Box className="h-4 w-4 text-muted-foreground" />
                                                {inventory.warehouse.name}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Location Code</Label>
                                            {editMode ? (
                                                <Input
                                                    value={formData.locationCode}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, locationCode: e.target.value }))}
                                                    placeholder="e.g. A-01-02"
                                                />
                                            ) : (
                                                <div className="font-medium font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded inline-block">
                                                    {inventory.locationCode || 'N/A'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Lot / Batch Number</Label>
                                            {editMode ? (
                                                <Input
                                                    value={formData.lotNumber}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, lotNumber: e.target.value }))}
                                                    placeholder="LOT-2024-XXX"
                                                />
                                            ) : (
                                                <div className="font-medium font-mono">{inventory.lotNumber || 'N/A'}</div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Expiry Date</Label>
                                            <div className="font-medium text-muted-foreground text-sm italic">Not tracking expiry</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Meta & History */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Metadata</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Updated At</span>
                                        <span>{new Date(inventory.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Category</span>
                                        <Badge variant="secondary">{inventory.part.category}</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-50 dark:bg-slate-900/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <History className="h-4 w-4" />
                                        Recent Movements
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-6 text-muted-foreground text-xs">
                                        No recent movements recorded.
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="discussions" className="mt-4">
                    <EntityDiscussions
                        contextType="INVENTORY"
                        contextId={inventory.id}
                        contextTitle={`Inventory ${inventory.part.partNumber} - ${inventory.warehouse.name}`}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
