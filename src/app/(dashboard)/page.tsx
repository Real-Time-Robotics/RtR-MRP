'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompactStatsBar } from '@/components/ui/compact-stats-bar';
import { Button } from '@/components/ui/button';
import {
  Package,
  ShoppingCart,
  Factory,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { clientLogger } from '@/lib/client-logger';
import { ActivityTimelineWidget } from '@/components/activity-timeline';

interface DashboardStats {
  salesOrders: { total: number; pending: number };
  inventory: { total: number; lowStock: number };
  production: { total: number; inProgress: number };
  quality: { total: number; pending: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        clientLogger.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const quickLinks = [
    { label: 'Sales Orders', href: '/orders', icon: ShoppingCart, color: 'bg-primary-500' },
    { label: 'Inventory', href: '/inventory', icon: Package, color: 'bg-success-500' },
    { label: 'Production', href: '/production', icon: Factory, color: 'bg-chart-purple' },
    { label: 'MRP Planning', href: '/mrp', icon: TrendingUp, color: 'bg-warning-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.description')}</p>
      </div>

      {/* KPI Stats - compact inline */}
      <CompactStatsBar stats={[
        { label: `Sales Orders (${stats?.salesOrders.pending || 0} pending)`, value: stats?.salesOrders.total || 0 },
        { label: `Inventory (${stats?.inventory.lowStock || 0} low stock)`, value: stats?.inventory.total || 0, color: 'text-success-600' },
        { label: `Work Orders (${stats?.production.inProgress || 0} in progress)`, value: stats?.production.total || 0, color: 'text-purple-600' },
        { label: `Quality (${stats?.quality.pending || 0} pending)`, value: stats?.quality.total || 0, color: 'text-danger-600' },
      ]} />

      {/* Activity Timeline Widget */}
      <ActivityTimelineWidget />

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Button
                key={link.href}
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => router.push(link.href)}
              >
                <div className={`p-2 rounded-lg ${link.color}`}>
                  <link.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">{link.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
