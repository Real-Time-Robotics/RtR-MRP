'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sales Orders</p>
                <p className="text-2xl font-bold">{stats?.salesOrders.total || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.salesOrders.pending || 0} pending
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Items</p>
                <p className="text-2xl font-bold">{stats?.inventory.total || 0}</p>
                <p className="text-xs text-amber-600">
                  {stats?.inventory.lowStock || 0} low stock
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success-100 dark:bg-success-900/50 flex items-center justify-center">
                <Package className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Work Orders</p>
                <p className="text-2xl font-bold">{stats?.production.total || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.production.inProgress || 0} in progress
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <Factory className="h-6 w-6 text-chart-purple dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quality Issues</p>
                <p className="text-2xl font-bold">{stats?.quality.total || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.quality.pending || 0} pending review
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-danger-100 dark:bg-danger-900/50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-danger-600 dark:text-danger-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
