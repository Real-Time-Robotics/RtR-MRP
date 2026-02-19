
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, Settings2, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { toast } from 'sonner';
import { clientLogger } from '@/lib/client-logger';

interface WorkCenterDetail {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    description?: string;
    capacity?: number;
    utilization?: number;
}

export default function WorkCenterDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [workCenter, setWorkCenter] = useState<WorkCenterDetail | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                // Assuming API endpoint follows standard pattern
                const res = await fetch(`/api/production/work-centers/${params.id}`);
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Work Center not found");
                    throw new Error("Failed to load details");
                }
                const data = await res.json();
                setWorkCenter(data);
            } catch (error) {
                clientLogger.error("Fetch error:", error);
                toast.error("Could not load Work Center details");
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!workCenter) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold">Work Center Not Found</h2>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Quay lại">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{workCenter.code}</h1>
                    <p className="text-muted-foreground">{workCenter.name}</p>
                </div>
                <div className="ml-auto">
                    <Button variant="outline">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Configure
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm text-muted-foreground">Type</span>
                                <div className="font-medium">{workCenter.type}</div>
                            </div>
                            <div>
                                <span className="text-sm text-muted-foreground">Status</span>
                                <div className="font-medium capitalize">{workCenter.status}</div>
                            </div>
                            <div>
                                <span className="text-sm text-muted-foreground">Capacity</span>
                                <div className="font-medium">{workCenter.capacity || 0} Hours/Week</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            <Calendar className="h-8 w-8 mb-2 opacity-50" />
                            No active jobs
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
