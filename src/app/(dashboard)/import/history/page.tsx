'use client';

// src/app/(dashboard)/import/history/page.tsx
// Import History Page - View all import sessions

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportHistory, SavedMappings } from '@/components/import';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ImportHistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('history');

  const handleViewSession = (sessionId: string) => {
    // Navigate to session detail or show modal
    console.log('View session:', sessionId);
    // TODO: Implement session detail view
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/import">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6" />
              Lịch sử Import
            </h1>
            <p className="text-muted-foreground mt-1">
              Xem và quản lý các phiên import trước đây
            </p>
          </div>
        </div>
        <Link href="/excel/import">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Import mới
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">Lịch sử import</TabsTrigger>
          <TabsTrigger value="mappings">Mapping đã lưu</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tất cả phiên import</CardTitle>
            </CardHeader>
            <CardContent>
              <ImportHistory onViewSession={handleViewSession} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapping templates đã lưu</CardTitle>
            </CardHeader>
            <CardContent>
              <SavedMappings
                onSelectMapping={(mapping) => {
                  router.push(`/excel/import?mappingId=${mapping.id}`);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
